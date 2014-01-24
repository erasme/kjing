// DirectoryService.cs
// 
//  Directory to reference all resources of KJing
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2013-2014 Departement du Rhone
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Data;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Authentication;
using Erasme.Cloud.Storage;

namespace KJing.Directory
{
	public struct Rights
	{
		public bool Read;
		public bool Write;
		public bool Admin;

		public Rights(bool read, bool write, bool admin)
		{
			Read = read;
			Write = write;
			Admin = admin;
		}

		public Rights(Rights rights)
		{
			Read = rights.Read;
			Write = rights.Write;
			Admin = rights.Admin;
		}

		public override string ToString()
		{
			return "Rights(read: "+Read+", write: "+Write+", admin: "+Admin+")";
		}
	}

	public class DirectoryService: IHttpHandler
	{
		IDbConnection dbcon;
		string authHeader;
		string authCookie;
		AuthSessionService authSessionService;
		StorageService storageService;
		string temporaryDirectory;
		int cacheDuration;
		ILogger logger;
		string basePath;

		object instanceLock = new object();
		Dictionary<string, WebSocketHandlerCollection<ResourceClient>> clients = new Dictionary<string, WebSocketHandlerCollection<ResourceClient>>();

		public class ResourceClient: WebSocketHandler
		{
			object instanceLock = new object();
			JsonValue values = null;

			public ResourceClient(DirectoryService service, string resource)
			{
				Service = service;
				Resource = resource;
			}

			public DirectoryService Service { get; private set; }

			public string Resource { get; private set; }

			public string Id {
				get {
					return Context.Client.RemoteEndPoint.ToString();
				}
			}

			public string User {
				get {
					return Context.User;
				}
			}

			public JsonValue Values {
				get {
					string jsonString = null;
					lock(instanceLock) {
						if(values != null)
							jsonString = values.ToString();
					}
					if(jsonString == null)
						return null;
					else
						return JsonValue.Parse(jsonString);
				}
			}

			public override void OnOpen()
			{
				JsonValue oldResource = Service.GetResource(Resource, null, 0);
				// register the client in the currently connected users
				lock(Service.instanceLock) {
					WebSocketHandlerCollection<ResourceClient> handlers;
					if(Service.clients.ContainsKey(Resource))
						handlers = Service.clients[Resource];
					else {
						handlers = new WebSocketHandlerCollection<ResourceClient>();
						Service.clients[Resource] = handlers;
					}
					handlers.Add(this);
				}
				JsonValue newResource = Service.GetResource(Resource, null, 0);
				// notify change
				Service.NotifyChange(oldResource, newResource);
			}

			public override void OnMessage(string message)
			{
				JsonValue json = JsonValue.Parse(message);
				if(json.ContainsKey("type")) {
					string type = (string)json["type"];
					if((type == "clientdata") && (json.ContainsKey("data"))) {
						JsonValue oldResource = Service.GetResource(Resource, null, 0);
						lock(instanceLock) {
							values = json["data"];
						}
						JsonValue newResource = Service.GetResource(Resource, null, 0);
						// notify change
						Service.NotifyChange(oldResource, newResource);
					}
					else if((type == "clientmessage") && (json.ContainsKey("message")) && (json.ContainsKey("destination"))) {
						Service.SendMessage(Resource, Id, json["destination"], json["message"]);
					}
				}
			}

			public override void OnError()
			{
				Close();
			}

			public override void OnClose()
			{
				JsonValue oldResource = Service.GetResource(Resource, null, 0);
				lock(Service.instanceLock) {
					if(Service.clients.ContainsKey(Resource)) {
						Service.clients[Resource].Remove(this);
						if(Service.clients[Resource].Count == 0)
							Service.clients.Remove(Resource);
					}
				}
				JsonValue newResource = Service.GetResource(Resource, null, 0);
//				Console.WriteLine("OnClose for " + Resource + ": " + newResource.ToString());
				// notify change
				Service.NotifyChange(oldResource, newResource);
			}
		}

		public DirectoryService(
			string basepath, AuthSessionService authSessionService, string authHeader, string authCookie,
			StorageService storageService, string temporaryDirectory, int cacheDuration, ILogger logger)
		{
			this.basePath = basepath;
			this.authSessionService = authSessionService;
			this.authHeader = authHeader;
			this.authCookie = authCookie;
			this.storageService = storageService;
			this.temporaryDirectory = temporaryDirectory;
			this.cacheDuration = cacheDuration;
			this.logger = logger;

			if(!System.IO.Directory.Exists(basepath))
				System.IO.Directory.CreateDirectory(basepath);

			if(!System.IO.Directory.Exists(basepath+"/faces"))
				System.IO.Directory.CreateDirectory(basepath+"/faces");

			if(!System.IO.Directory.Exists(basepath+"/maps"))
				System.IO.Directory.CreateDirectory(basepath+"/maps");

			bool createNeeded = !File.Exists(basepath+"/directory.db");

			dbcon = (IDbConnection)new SqliteConnection("URI=file:"+basepath+"/directory.db");
			dbcon.Open();

			if(createNeeded) {
				// create resource table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE resource ("+
						"id VARCHAR PRIMARY KEY, type VARCHAR NOT NULL, parent VARCHAR DEFAULT NULL,"+
						"name VARCHAR DEFAULT NULL, ctime INTEGER)";
					dbcmd.CommandText = sql;
					dbcmd.ExecuteNonQuery();
				}
				// create user table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE user (id VARCHAR PRIMARY KEY,"+
						"firstname VARCHAR DEFAULT NULL, lastname VARCHAR DEFAULT NULL,"+
						"email VARCHAR DEFAULT NULL, description VARCHAR DEFAULT NULL,"+
						"quota INTEGER DEFAULT 0, used INTEGER DEFAULT 0,"+
						"admin INTEGER(1) DEFAULT 0, face_rev INTEGER DEFAULT -1,"+
						"login VARCHAR DEFAULT NULL, password VARCHAR DEFAULT NULL, "+
						"googleid VARCHAR DEFAULT NULL,"+
						"facebookid VARCHAR DEFAULT NULL)";
					dbcmd.CommandText = sql;
					dbcmd.ExecuteNonQuery();
				}
				// create ugroup_user table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE ugroup_user (ugroup VARCHAR NOT NULL, user VARCHAR NOT NULL)";
					dbcmd.CommandText = sql;
					dbcmd.ExecuteNonQuery();
				}
				// create right table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE right (user VARCHAR NOT NULL, resource VARCHAR NOT NULL,"+
						"read INTEGER(1) DEFAULT 0, write INTEGER(1) DEFAULT 0, admin INTEGER(1) DEFAULT 0)";
					dbcmd.CommandText = sql;
					dbcmd.ExecuteNonQuery();
				}
				// create the device table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE device (id VARCHAR PRIMARY KEY NOT NULL, path VARCHAR, "+
						"hwid VARCHAR DEFAULT NULL, loop INTEGER(1) DEFAULT 1, protocol VARCHAR DEFAULT 'web',"+
						"address VARCHAR DEFAULT NULL, password VARCHAR DEFAULT NULL)";
					dbcmd.CommandText = sql;
					dbcmd.ExecuteNonQuery();
				}
				// create the map_device table
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					string sql = "CREATE TABLE map_device (map VARCHAR NOT NULL, device VARCHAR NOT NULL, x REAL DEFAULT 0, y REAL DEFAULT 0)";
					dbcmd.CommandText = sql;
					dbcmd.ExecuteNonQuery();
				}
			}
			// disable disk sync
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "PRAGMA synchronous=0";
				dbcmd.ExecuteNonQuery();
			}
		}

		string GenerateRandomId(int size = 10)
		{
			// generate the random id
			string randchars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
			Random rand = new Random();
			StringBuilder sb = new StringBuilder(size);
			for(int i = 0; i < size; i++)
				sb.Append(randchars[rand.Next(randchars.Length)]);
			return sb.ToString();
		}

		public bool IsValidId(string id)
		{
			string chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:";
			for(int i = 0; i < id.Length; i++) {
				bool found = false;
				for(int i2 = 0; !found && (i2 < chars.Length); i2++) {
					found = (chars[i2] == id[i]);
				}
				if(!found)
					return false;
			}
			return true;
		}

		public void SendMessage(string resource, string source, string destination, JsonValue message)
		{
			JsonValue json = new JsonObject();
			json["type"] = "clientmessage";
			json["source"] = source;
			json["message"] = message;

			WebSocketHandlerCollection<ResourceClient> handlers = null;

			lock(instanceLock) {
				if(clients.ContainsKey(resource)) {
					handlers = clients[resource];
				}
			}
			if(handlers != null) {
				foreach(ResourceClient client in handlers) {
					if(client.Id == destination) {
						client.Send(json.ToString());
						break;
					}
				}
			}
		}

		void GetChangeInterestedIds(JsonValue values, List<string> ids) 
		{
			string id = (string)values["id"];
			string parent = (values["parent"] != null) ? (string)values["parent"] : null;
			if(!ids.Contains(id))
				ids.Add(id);
			if((parent != null) && !ids.Contains(parent))
				ids.Add(parent);
			// TODO: handle type specific interested
		}

		public void NotifyChange(JsonValue oldValues, JsonValue newValues)
		{
			
			List<string> ids = new List<string>();
			if(newValues != null)
				GetChangeInterestedIds(newValues, ids);
			if(oldValues != null)
				GetChangeInterestedIds(oldValues, ids);

//			string resource = (oldValues != null) ? oldValues["id"] : ((newValues != null) ? newValues["id"] : null);
			string interestedIds = "";

			WebSocketHandlerCollection<ResourceClient> handlers = null;
			foreach(string id in ids) {
				interestedIds += id + ",";
				lock(instanceLock) {
					if(clients.ContainsKey(id))
						handlers = clients[id];
				}
				if(handlers != null) {
					JsonValue json = new JsonObject();
					json["type"] = "change";
					json["id"] = id;
					handlers.Broadcast(json.ToString());
				}
			}
//			Console.WriteLine("NotifyChange Id: "+resource+", Interested: "+interestedIds);
		}

		public JsonValue GetResource(string id, string filterBy, int depth)
		{
			JsonValue res;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					res = GetResource(dbcon, transaction, id, filterBy, depth);
					transaction.Commit();
				}
			}
			return res;
		}

		JsonValue GetResource(IDbConnection dbcon, IDbTransaction transaction, string id, string filterBy, int depth)
		{
			List<string> groups = null;
			Rights heritedRights = new Rights(false, false, false);
			Rights ownRights;
			List<string> parents = GetResourceParents(dbcon, transaction, id);
			string owner;
			if(parents.Count == 0)
				owner = id;
			else
				owner = parents[0];
			if(filterBy != null) {
				groups = new List<string>();
				GetUserGroups(dbcon, transaction, filterBy, groups);
				foreach(string parent in parents) {
					GetResource(dbcon, transaction, parent, filterBy, 0, groups, heritedRights, out ownRights, owner);
					heritedRights = ownRights;
				}
			}
			return GetResource(dbcon, transaction, id, filterBy, depth, groups, heritedRights, out ownRights, owner);
		}

		string GetResourceParent(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			string parent;
			// select from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT parent FROM resource WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				parent = dbcmd.ExecuteScalar() as string;
			}
			return parent;
		}

		List<string> GetResourceParents(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			List<string> parents = new List<string>();
			while((id = GetResourceParent(dbcon, transaction, id)) != null) {
				parents.Add(id);
			}
			parents.Reverse();
			return parents;
		}

		JsonArray GetResourceRights(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			// get rights
			JsonArray rights = new JsonArray();
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT user,read,write,admin FROM right WHERE resource=@resource";
				dbcmd.Parameters.Add(new SqliteParameter("resource", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						string user = reader.GetString(0);
						bool read = (reader.GetInt32(1) != 0);
						bool write = (reader.GetInt32(2) != 0);
						bool admin = (reader.GetInt32(3) != 0);
						JsonValue right = new JsonObject();
						right["user"] = user;
						right["read"] = read;
						right["write"] = write;
						right["admin"] = admin;
						rights.Add(right);
					}
				}
			}
			return rights;
		}

		JsonArray GetResourceClients(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			WebSocketHandlerCollection<ResourceClient> resourceClients = null;

			// get clients
			JsonArray jsonClients = new JsonArray();
			lock(instanceLock) {
				if(clients.ContainsKey(id))
					resourceClients = clients[id];
			}
			if(resourceClients != null) {
				foreach(ResourceClient client in resourceClients) {
					JsonValue jsonClient = new JsonObject();
					jsonClient["id"] = client.Id;
					jsonClient["user"] = client.User;
					jsonClient["data"] = client.Values;
					jsonClients.Add(jsonClient);
				}
			}
			return jsonClients;
		}

		JsonValue GetResource(IDbConnection dbcon, IDbTransaction transaction, string id, string filterBy, int depth, List<string> groups, Rights heritedRights, out Rights ownRights, string owner)
		{
			JsonValue resource = new JsonObject();

			// select from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,type,name,parent,strftime('%s',ctime) FROM resource WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(!reader.Read())
						throw new WebException(404, 0, "Resource not found");
					resource["id"] = reader.GetString(0);
					string type = reader.GetString(1);
					resource["type"] = type;
					resource["owner"] = owner;
					if(reader.IsDBNull(2))
						resource["name"] = null;
					else
						resource["name"] = reader.GetString(2);
					if(reader.IsDBNull(3))
						resource["parent"] = null;
					else
						resource["parent"] = reader.GetString(3);
					if(reader.IsDBNull(4))
						resource["ctime"] = 0;
					else
						resource["ctime"] = Convert.ToInt64(reader.GetString(4));
					// user
					if(type == "user") {
						GetUser(dbcon, transaction, id, resource, filterBy, depth, groups, heritedRights);
					}
					// group
					else if(type == "group") {
						GetGroup(dbcon, transaction, id, resource, filterBy);
					}
					// map
					else if(type == "map") {
						GetMap(dbcon, transaction, id, resource, filterBy);
					}
					// device
					else if(type == "device") {
						GetDevice(dbcon, transaction, id, resource, filterBy);
					}
					// file share
					else if(type == "share") {
						GetShare(dbcon, transaction, id, resource, filterBy);
					}
				}
			}
			// get rights
			JsonArray rights = GetResourceRights(dbcon, transaction, id);
			resource["rights"] = rights;

			// get connected clients
			resource["clients"] = GetResourceClients(dbcon, transaction, id);

			// handle filterBy user's rights
			if(filterBy != null) {
				ownRights = new Rights(heritedRights.Read, heritedRights.Write, heritedRights.Admin);

				if(((string)resource["id"] == filterBy) || ((string)resource["parent"] == filterBy)) {
					ownRights.Read = true;
					ownRights.Write = true;
					ownRights.Admin = true;
				}

				// check rights attached to this resource
				foreach(JsonValue right in rights) {
					if(((string)right["user"] == filterBy) || groups.Contains((string)right["user"])) {
						ownRights.Read |= (bool)right["read"];
						ownRights.Write |= (bool)right["write"];
						ownRights.Admin |= (bool)right["admin"];
					}
				}

				JsonObject jsonOwnRights = new JsonObject();
				jsonOwnRights["read"] = ownRights.Read;
				jsonOwnRights["write"] = ownRights.Write;
				jsonOwnRights["admin"] = ownRights.Admin;
				resource["ownRights"] = jsonOwnRights;
			}
			else
				ownRights = new Rights(true, true, true);

			// get child resources
			if(depth > 0)
				resource["children"] = GetResources(dbcon, transaction, id, filterBy, depth-1, groups, ownRights, owner);
			return resource;
		}

		JsonValue GetResources(IDbConnection dbcon, IDbTransaction transaction, string parent, string filterBy, int depth, List<string> groups, Rights heritedRights, string owner)
		{
			JsonArray resources = new JsonArray();

			// select from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id FROM resource WHERE parent=@parent";
				dbcmd.Parameters.Add(new SqliteParameter("parent", parent));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						if(!reader.IsDBNull(0)) {
							Rights ownRights;
							JsonValue json = GetResource(dbcon, transaction, reader.GetString(0), filterBy, depth, groups, heritedRights, out ownRights, owner);
							// filter the resource by what the filterBy user can view
							if((filterBy == null) || ((bool)json["ownRights"]["read"]))
								resources.Add(json);
						}
					}
				}
			}
			return resources;
		}

		void GetUserGroups(IDbConnection dbcon, IDbTransaction transaction, string id, List<string> groups)
		{
			// select from the user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT ugroup FROM ugroup_user WHERE user=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						if(!reader.IsDBNull(0)) {
							string g = reader.GetString(0);
							if(!groups.Contains(g)) {
								groups.Add(g);
								GetUserGroups(dbcon, transaction, g, groups);
							}
						}
					}
				}
			}
		}

		JsonArray GetUserShares(IDbConnection dbcon, IDbTransaction transaction, string user, int depth, List<string> groups)
		{
			JsonArray shares = new JsonArray();

			StringBuilder sb = new StringBuilder();
			sb.Append("'"); sb.Append(user.Replace("'", "''")); sb.Append("'");
			foreach(string g in groups) {
				sb.Append(",'"); sb.Append(g.Replace("'", "''")); sb.Append("'");
			}

			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT resource FROM right WHERE user IN ("+sb.ToString()+")";
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						try {
							shares.Add(GetResource(dbcon, transaction, reader.GetString(0), user, depth-1));
						}
						catch(WebException e) {
							logger.Log(LogLevel.Error, "Error while getting shared resource '" + reader.GetString(0) + "' by user '" + user + "' (" + e.ToString() + ")");
						}
					}
				}
			}
			return shares;
		}

		JsonArray GetUserShares(string user, int depth)
		{
			JsonArray res;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					List<string> groups = new List<string>();
					GetUserGroups(dbcon, transaction, user, groups);
					res = GetUserShares(dbcon, transaction, user, depth, groups);
					transaction.Commit();
				}
			}
			return res;
		}

		bool TestResource(JsonValue resource, string word)
		{
			foreach(string key in resource.Keys) {
				if((resource[key] == null) || (resource[key].JsonType != JsonType.String))
					continue;
				string value = resource[key].Value as string;
				if((value != null) && (value.IndexOf(word, StringComparison.InvariantCultureIgnoreCase) != -1))
					return true;
			}
			return false;
		}

		bool CheckFilters(JsonValue json, Dictionary<string, string> filters)
		{
			if(filters == null)
				return true;
			foreach(string key in filters.Keys) {
				if(!json.ContainsKey(key))
					return false;
				if(!Regex.IsMatch((string)json[key], filters[key], RegexOptions.CultureInvariant | RegexOptions.IgnoreCase | RegexOptions.IgnorePatternWhitespace))
					return false;
			}
			return true;
		}

		void SearchResources(JsonValue resource, string[] words, Dictionary<string,string> filters, JsonArray result)
		{
			// first check if the resource is not already in the result
			foreach(JsonValue tmp in result) {
				if(tmp["id"] == resource["id"])
					return;
			}

			bool allFound = true;
			for(int i = 0; allFound && (i < words.Length); i++) {
				allFound = TestResource(resource, words[i]);
			}
			if(allFound && CheckFilters(resource, filters))
				result.Add(resource);

			if(resource.ContainsKey("children")) {
				foreach(JsonValue child in ((JsonArray)resource["children"])) {
					SearchResources(child, words, filters, result);
				}
			}
		}

		JsonArray SearchResources(string query, Dictionary<string,string> filters, string seenBy)
		{
			string[] words = query.Split(' ', '\t', '\n');
			JsonArray result = new JsonArray();

			// first, get the user itself
			JsonValue user = GetResource(seenBy, seenBy, 20);
			SearchResources(user, words, filters, result);

			// find the other shared roots
			JsonArray shares = GetUserShares(seenBy, 20);
			foreach(JsonValue share in shares)
				SearchResources(share, words, filters, result);

			return result;
		}

		public JsonValue CreateResource(JsonValue data)
		{
			JsonValue json;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					json = CreateResource(dbcon, transaction, data);
					transaction.Commit();
				}
			}
			NotifyChange(null, json);
			return json;
		}

		JsonValue CreateResource(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
			string id = null;
			string type = (string)data["type"];
			int count = 0;
			// generate the random session id
			do {
				id = type+":"+GenerateRandomId();
				// check if resource id already exists
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM resource WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					count = Convert.ToInt32(dbcmd.ExecuteScalar());
				}
			} while(count > 0);
			data["id"] = id;

			if(type == "user") {
				CreateUser(dbcon, transaction, data);
			}
			else if(type == "group") {
				CreateGroup(dbcon, transaction, data);
			}
			else if(type == "map") {
				CreateMap(dbcon, transaction, data);
			}
			else if(type == "device") {
				CreateDevice(dbcon, transaction, data);
			}
			else if(type == "share") {
				CreateShare(dbcon, transaction, data);
			}

			string parent = null;
			if(data.ContainsKey("parent"))
				parent = (string)data["parent"];
			string name = null;
			if(data.ContainsKey("name"))
				name = (string)data["name"];

			// insert into resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "INSERT INTO resource (id,type,ctime,parent,name) VALUES (@id,@type,DATETIME('now'),@parent,@name)";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Parameters.Add(new SqliteParameter("type", type));
				dbcmd.Parameters.Add(new SqliteParameter("parent", parent));
				dbcmd.Parameters.Add(new SqliteParameter("name", name));
				if(dbcmd.ExecuteNonQuery() != 1)
					throw new Exception("Resource create fails");
			}

			return GetResource(dbcon, transaction, id, null, 0);
		}

		public JsonValue ChangeResource(string id, JsonValue diff)
		{
			JsonValue jsonOld;
			JsonValue jsonNew;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					jsonOld = GetResource(dbcon, transaction, id, null, 0);
					jsonNew = ChangeResource(dbcon, transaction, id, diff);
					transaction.Commit();
				}
			}
			// notify the current resource change
			NotifyChange(jsonOld, jsonNew);
			return jsonNew;
		}

		JsonValue ChangeResource(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue diff)
		{
			// get the resource type
			string type = null;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT type FROM resource WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				type = dbcmd.ExecuteScalar() as string;
			}
			if(type == null)
				return null;

			// handle parent resource field
			if(diff.ContainsKey("parent")) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE resource SET parent=@parent WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("parent", (string)diff["parent"]));
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.ExecuteNonQuery();
				}
			}

			// handle name resource field
			if(diff.ContainsKey("name")) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE resource SET name=@name WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("name", (string)diff["name"]));
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.ExecuteNonQuery();
				}
			}

			if(type == "user") {
				ChangeUser(dbcon, transaction, id, diff);
			}
			else if(type == "group") {
				ChangeGroup(dbcon, transaction, id, diff);
			}
			else if(type == "map") {
				ChangeMap(dbcon, transaction, id, diff);
			}
			else if(type == "device") {
				ChangeDevice(dbcon, transaction, id, diff);
			}
			else if(type == "share") {
				ChangeShare(dbcon, transaction, id, diff);
			}
			return GetResource(dbcon, transaction, id, null, 0);
		}

		public void DeleteResource(string id)
		{
			List<string> children = new List<string>();
			JsonValue jsonResource;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					jsonResource = GetResource(dbcon, transaction, id, null, 0);
					DeleteResource(dbcon, transaction, id);

					// select from the resource table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id FROM resource WHERE parent=@parent";
						dbcmd.Parameters.Add(new SqliteParameter("parent", id));
						dbcmd.Transaction = transaction;
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {
								if(!reader.IsDBNull(0))
									children.Add(reader.GetString(0));
							}
						}
					}
					transaction.Commit();
				}
			}
			// notify the change
			NotifyChange(jsonResource, null);

			// delete children resources after realising the DB lock
			// because it can be long and its not a critical task
			foreach(string child in children) {
				DeleteResource(child);
			}
		}

		void DeleteResource(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			// get the resource type
			string type = null;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT type FROM resource WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				type = dbcmd.ExecuteScalar() as string;
			}
			if(type == null)
				return;

			if(type == "user") {
				DeleteUser(dbcon, transaction, id);
			}
			else if(type == "group") {
				DeleteGroup(dbcon, transaction, id);
			}
			else if(type == "map") {
				DeleteMap(dbcon, transaction, id);
			}
			else if(type == "device") {
				DeleteDevice(dbcon, transaction, id);
			}
			else if(type == "share") {
				DeleteShare(dbcon, transaction, id);
			}

			// delete from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM resource WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				if(dbcmd.ExecuteNonQuery() != 1)
					throw new Exception("Resource delete fails");
			}
		}

		public void AddResourceRights(string id, JsonValue rights)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					AddResourceRights(dbcon, transaction, id, rights);
					transaction.Commit();
				}
			}
		}

		void AddResourceRights(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue rights)
		{
			// get old rights
			JsonArray resourceRights = GetResourceRights(dbcon, transaction, id);

			// merge rights
			JsonArray jsonArray = null;
			if(rights is JsonObject) {
				jsonArray = new JsonArray();
				jsonArray.Add(rights);
			}
			else if(rights is JsonArray)
				jsonArray = (JsonArray)rights;
			if(jsonArray == null)
				return;
			foreach(JsonValue right in jsonArray) {
				JsonValue found = null;
				foreach(JsonValue resourceRight in resourceRights) {
					if((string)resourceRight["user"] == (string)right["user"]) {
						found = resourceRight;
						break;
					}
				}
				if(found == null) {
					if(!right.ContainsKey("admin"))
						right["admin"] = false;
					if(!right.ContainsKey("read"))
						right["read"] = false;
					if(!right.ContainsKey("write"))
						right["write"] = false;
					resourceRights.Add(right);
				}
				else {
					if(right.ContainsKey("admin"))
						found["admin"] = right["admin"];
					if(right.ContainsKey("read"))
						found["read"] = right["read"];
					if(right.ContainsKey("write"))
						found["write"] = right["write"];
				}
			}

			// clean up old rights
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM right WHERE resource=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}

			// create the new ones
			foreach(JsonValue right in resourceRights) {
				if((bool)right["admin"] || (bool)right["read"] || (bool)right["write"]) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "INSERT INTO right (resource,user,admin,read,write) VALUES (@resource,@user,@admin,@read,@write)";
						dbcmd.Parameters.Add(new SqliteParameter("resource", id));
						dbcmd.Parameters.Add(new SqliteParameter("user", (string)right["user"]));
						dbcmd.Parameters.Add(new SqliteParameter("admin", (bool)right["admin"]));
						dbcmd.Parameters.Add(new SqliteParameter("read", (bool)right["read"]));
						dbcmd.Parameters.Add(new SqliteParameter("write", (bool)right["write"]));
						dbcmd.ExecuteNonQuery();
					}
				}
			}
		}

		////////////////////////////////////////////////////////////////////////////////
		// Handle user resource
		////////////////////////////////////////////////////////////////////////////////

		bool IsPasswordSecure(string password)
		{
			if(password.Length < 8)
				return false;
			bool hasNumber = false;
			bool hasLetter = false;
			for(int i = 0; i < password.Length; i++) {
				char character = password[i];
				if(Char.IsDigit(character))
					hasNumber = true;
				if(Char.IsLetter(character))
					hasLetter = true;
			}
			return hasNumber && hasLetter;
		}

		bool IsEmailValid(string email)
		{
			try {
				new System.Net.Mail.MailAddress(email);
				return true;
			}
			catch {
				return false;
			}
		}

		void GetUser(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights)
		{
			// select from the user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT firstname,lastname,login,email,googleid,facebookid,description,quota,used,admin,face_rev FROM user WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using (IDataReader reader = dbcmd.ExecuteReader()) {
					if(!reader.Read())
						throw new WebException(404, 0, "User not found");
					if(reader.IsDBNull(0))
						value["firstname"] = null;
					else
						value["firstname"] = reader.GetString(0);
					if(reader.IsDBNull(1))
						value["lastname"] = null;
					else
						value["lastname"] = reader.GetString(1);
					if(reader.IsDBNull(2))
						value["login"] = null;
					else
						value["login"] = reader.GetString(2);
					if(reader.IsDBNull(3))
						value["email"] = null;
					else
						value["email"] = reader.GetString(3);
					if(reader.IsDBNull(4))
						value["googleid"] = null;
					else
						value["googleid"] = reader.GetString(4);
					if(reader.IsDBNull(5))
						value["facebookid"] = null;
					else
						value["facebookid"] = reader.GetString(5);
					if(reader.IsDBNull(6))
						value["description"] = null;
					else
						value["description"] = reader.GetString(6);
					value["quota"] = reader.GetInt64(7);
					value["used"] = reader.GetInt64(8);
					value["admin"] = (reader.GetInt64(9) != 0);
					value["face_rev"] = reader.GetInt64(10);
				}
			}

			if((filterBy != null) && (filterBy != id) && (depth > 0)) {
				// select resources shared by this user
				JsonArray shares = new JsonArray();
				value["shares"] = shares;

				JsonArray allShares = GetUserShares(dbcon, transaction, filterBy, depth, groups);
				foreach(JsonValue share in allShares) {
					if(share["owner"] == id)
						shares.Add(share);
				}

				// get the groups this user is in
				JsonArray jsonGroups = new JsonArray();
				value["groups"] = jsonGroups;

				foreach(string g in groups) {
					try {
						jsonGroups.Add(GetResource(dbcon, transaction, g, filterBy, depth-1));
					}
					catch(WebException e) {
						logger.Log(LogLevel.Error, "Group '" + g + "' not found while getting user '" + id + "' (" + e.ToString() + ")");
					}
				}
			}
		}

		void CreateUser(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
			string user = (string)data["id"];
			bool first = true;
			StringBuilder sbKeys = new StringBuilder();
			StringBuilder sbValues = new StringBuilder();

			if(data.ContainsKey("login") && (data["login"] != null)) {
				// a password must be given if a login is given
				if(!data.ContainsKey("password") || (data["password"] == null))
					throw new WebException(400, 0, "a password MUST be provided when a login is created");
				// test if password is secure enought
				if(!IsPasswordSecure((string)data["password"]))
					throw new WebException(403, 1, "password is too weak, provide another password");
				// ok, use SHA1 to not store the password in the DB
				System.Security.Cryptography.SHA1 hmac = System.Security.Cryptography.SHA1CryptoServiceProvider.Create();
				string sha1Password = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes((string)data["password"])));
				data["password"] = "sha1:"+sha1Password;
			}

			if(data.ContainsKey("email")) {
				// empty email is like null
				if((string)data["email"] == "")
					data["email"] = null;
				else if(((string)data["email"] != null) && !IsEmailValid((string)data["email"]))
					throw new WebException(403, 2, "email is not valid. Provide another one");
			}

			foreach(string key in new string[]{ "firstname", "lastname", "description", "email", "login",
				"password", "googleid", "facebookid" }) {
				if(data.ContainsKey(key) && (data[key] != null)) {
					if(first)
						first = false;
					else {
						sbKeys.Append(",");
						sbValues.Append(",");
					}
					sbKeys.Append(key);
					sbValues.Append("'");
					sbValues.Append(((string)data[key]).Replace("'","''"));
					sbValues.Append("'");
				}
			}
			// handle booleans
			foreach(string key in new string[]{ "admin" }) {
				if(data.ContainsKey(key) && (data[key] != null)) {
					if(first)
						first = false;
					else {
						sbKeys.Append(",");
						sbValues.Append(",");
					}
					sbKeys.Append(key);
					sbValues.Append(((bool)data[key])?1:0);
				}
			}

			// check if the login is already used
			if(data.ContainsKey("login") && (data["login"] != null)) {
				string login = (string)data["login"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE login='"+login.Replace("'","''")+"'";
					if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
						throw new WebException(409, 2, "login already used, choose another one");
				}
			}

			// check if the googleid is already used
			if(data.ContainsKey("googleid") && (data["googleid"] != null)) {
				string googleid = (string)data["googleid"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE googleid='"+googleid.Replace("'","''")+"'";
					if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
						throw new WebException(409, 3, "googleid already used");
				}
			}

			// check if the facebookid is already used
			if(data.ContainsKey("facebookid") && (data["facebookid"] != null)) {
				string facebookid = (string)data["facebookid"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE facebookid='"+facebookid.Replace("'","''")+"'";
					if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
						throw new WebException(409, 3, "facebookid already used");
				}
			}

			// insert into user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "INSERT INTO user (id,"+sbKeys.ToString()+") VALUES ('"+user+"',"+sbValues.ToString()+")";
				if(dbcmd.ExecuteNonQuery() != 1)
					throw new Exception("User create fails");
			}

			// if first created user, set the admin flags
			bool firstUser = false;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT COUNT(id) FROM user";
				firstUser = (Convert.ToInt32(dbcmd.ExecuteScalar()) == 1);
			}
			if(firstUser) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE user SET admin=1 WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", user));
					dbcmd.ExecuteNonQuery();
				}
			}
		}

		void ChangeUser(IDbConnection dbcon, IDbTransaction transaction, string user, JsonValue diff)
		{			
			bool first = true;
			StringBuilder sb = new StringBuilder();

			// nothing to do if the diff is empty
			if(diff.Keys.Count == 0)
				return;

			if(diff.ContainsKey("password") && (diff["password"] != null)) {
				// test if password is secure enought
				if(!IsPasswordSecure((string)diff["password"]))
					throw new WebException(403, 1, "password is too weak, provide another password");
				// ok, use SHA1 to not store the password in the DB
				System.Security.Cryptography.SHA1 hmac = System.Security.Cryptography.SHA1CryptoServiceProvider.Create();
				string sha1Password = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes((string)diff["password"])));
				diff["password"] = "sha1:" + sha1Password;
			}

			if(diff.ContainsKey("email")) {
				// empty email is like null
				if((string)diff["email"] == "")
					diff["email"] = null;
				else if(((string)diff["email"] != null) && !IsEmailValid((string)diff["email"]))
					throw new WebException(403, 2, "email is not valid. Provide another one");
			}

			// handle strings
			foreach(string key in new string[]{ "firstname", "lastname", "description", "email", "login",
				"password", "googleid", "facebookid" }) {
				if(diff.ContainsKey(key)) {
					if(first)
						first = false;
					else
						sb.Append(",");
					sb.Append(key);
					sb.Append("=");
					string value = (string)diff[key];
					if(value == null)
						sb.Append("null");
					else {
						sb.Append("'");
						sb.Append(value.Replace("'","''"));
						sb.Append("'");
					}
				}
			}

			// handle integer
			foreach(string key in new string[]{ "quota", "used" }) {
				if(diff.ContainsKey(key)) {
					if(first)
						first = false;
					else
						sb.Append(",");
					sb.Append(key);
					sb.Append("=");
					long value = (long)diff[key];
					sb.Append(value);
				}
			}

			// handle booleans
			if(diff.ContainsKey("admin")) {
				if(first)
					first = false;
				else
					sb.Append(",");
				sb.Append("admin");
				sb.Append("=");
				sb.Append(((bool)diff["admin"])?1:0);
			}

			// check if the login is already used
			if(diff.ContainsKey("login") && (diff["login"] != null)) {
				string login = (string)diff["login"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE login='"+login.Replace("'","''")+"' AND id != @user";
					dbcmd.Parameters.Add(new SqliteParameter("user", user));
					int count = Convert.ToInt32(dbcmd.ExecuteScalar());
					if(count >= 1)
						throw new WebException(409, 0, "login already used, choose another one");
				}
			}

			// check if the googleid is already used
			if(diff.ContainsKey("googleid") && (diff["googleid"] != null)) {
				string googleid = (string)diff["googleid"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE googleid=@googleid";
					dbcmd.Parameters.Add(new SqliteParameter("googleid", googleid));
					int count = Convert.ToInt32(dbcmd.ExecuteScalar());
					if(count >= 1)
						throw new WebException(409, 3, "googleid already used");
				}
			}

			// check if the facebookid is already used
			if(diff.ContainsKey("facebookid") && (diff["facebookid"] != null)) {
				string facebookid = (string)diff["facebookid"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE facebookid=@facebookid";
					dbcmd.Parameters.Add(new SqliteParameter("facebookid", facebookid));
					int count = Convert.ToInt32(dbcmd.ExecuteScalar());
					if(count >= 1)
						throw new WebException(409, 3, "facebookid already used");
				}
			}

			// update the user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "UPDATE user SET "+sb.ToString()+" WHERE id=@user";
				dbcmd.Parameters.Add(new SqliteParameter("user", user));
				int count = dbcmd.ExecuteNonQuery();
				if(count != 1)
					throw new Exception("User update fails");
			}
		}

		void DeleteUser(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM user WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
			// remove the user from the groups
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM ugroup_user WHERE user=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
			// remove the user from the rights
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM right WHERE user=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
		}

		public void SetUserFace(string user, string file) 
		{
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/convert", file+" -auto-orient -strip -set option:distort:viewport \"%[fx:min(w,h)]x%[fx:min(w,h)]+%[fx:max((w-h)/2,0)]+%[fx:max((h-w)/2,0)]\" -distort SRT 0 +repage -resize 100x100 png:"+basePath+"/faces/"+user);
			Process process = new Process();
			process.StartInfo = startInfo;
			process.Start();
			process.WaitForExit();
			process.Dispose();
			// update face revision
			long face_rev;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT face_rev FROM user WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("id", user));
						object res = dbcmd.ExecuteScalar();
						face_rev = Convert.ToInt64(res);
					}
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "UPDATE user SET face_rev=@rev WHERE id=@id";
						dbcmd.Parameters.Add(new SqliteParameter("rev", (++face_rev)));
						dbcmd.Parameters.Add(new SqliteParameter("id", user));
						dbcmd.ExecuteNonQuery();
					}
					transaction.Commit();
				}
			}
		}

		public long GetUserFaceRev(string user) 
		{
			long face_rev = 0;
			lock(dbcon) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "SELECT face_rev FROM user WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", user));
					face_rev = Convert.ToInt64(dbcmd.ExecuteScalar());
				}
			}
			return face_rev;
		}

		public void SetUserFaceFromUrl(string user, string url) 
		{
			string tmpFile = temporaryDirectory+"/"+Guid.NewGuid().ToString();
			using(FileStream fileStream = File.Create(tmpFile)) {
				// download the image
				using(WebRequest request = new WebRequest(url, allowAutoRedirect: true)) {
					HttpClientResponse response = request.GetResponse();
					response.InputStream.CopyTo(fileStream);
				}
			}
			SetUserFace(user, tmpFile);
			File.Delete(tmpFile);
		}

		JsonArray SearchUsers(string firstname, string lastname, string description, string query, int limit, string seenBy)
		{
			JsonArray users = new JsonArray();

			lock(dbcon) {						
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {

					// select from the user table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						string filter = "";
						if(firstname != null) {
							if(filter != "")
								filter += " AND ";
							filter += "firstname LIKE '%"+firstname.Replace("'","''")+"%'";
						}
						if(lastname != null) {
							if(filter != "")
								filter += " AND ";
							filter += "lastname LIKE '%"+lastname.Replace("'","''")+"%'";
						}
						if(description != null) {
							if(filter != "")
								filter += " AND ";
							filter += "description LIKE '%"+description.Replace("'","''")+"%'";
						}
						if(query != null) {
							string[] words = query.Split(' ', '\t', '\n');
							foreach(string word in words) {
								if(filter != "")
									filter += " AND ";
								filter += "(";
								bool first = true;
								foreach(string field in new string[]{"firstname", "lastname", "description"}) {
									if(first)
										first = false;
									else
										filter += " OR ";
									filter += field+" LIKE '%"+word.Replace("'","''")+"%'";
								}
								filter += ")";
							}
						}				
						if(filter != "")
							filter = "WHERE "+filter;
						dbcmd.CommandText = "SELECT id FROM user "+filter+" LIMIT "+limit;

						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {
								users.Add(GetResource(dbcon, transaction, reader.GetString(0), seenBy, 0));
							}
							// clean up
							reader.Close();
						}
					}
					transaction.Commit();
				}
			}
			return users;
		}

		////////////////////////////////////////////////////////////////////////////////
		// Handle group resource
		////////////////////////////////////////////////////////////////////////////////

		void GetGroup(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy)
		{
			// get users/groups in the group
			JsonArray users = new JsonArray();
			value["users"] = users;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT user FROM ugroup_user WHERE ugroup=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						users.Add(reader.GetString(0));
					}
				}
			}
		}

		void CreateGroup(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
		}

		void ChangeGroup(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue diff)
		{
		}

		void DeleteGroup(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			// delete from ugroup_user
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM ugroup_user WHERE ugroup=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
		}

		public void GroupRemoveUsers(string id, JsonValue data)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					if(data is JsonArray) {
						foreach(JsonValue item in (JsonArray)data) {
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.CommandText = "DELETE FROM ugroup_user WHERE ugroup=@id AND user=@user";
								dbcmd.Parameters.Add(new SqliteParameter("id", id));
								dbcmd.Parameters.Add(new SqliteParameter("user", (string)item["id"]));
								dbcmd.ExecuteNonQuery();
							}
						}
					}
					else {
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.CommandText = "DELETE FROM ugroup_user WHERE ugroup=@id AND user=@user";
							dbcmd.Parameters.Add(new SqliteParameter("ugroup", id));
							dbcmd.Parameters.Add(new SqliteParameter("user", (string)data["id"]));
							dbcmd.ExecuteNonQuery();
						}
					}
					transaction.Commit();
				}
			}
		}

		public void GroupRemoveUser(string id, string user)
		{
			lock(dbcon) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "DELETE FROM ugroup_user WHERE ugroup=@id AND user=@user";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("user", user));
					dbcmd.ExecuteNonQuery();
				}
			}
		}

		public void GroupAddUsers(string id, JsonValue data)
		{
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					JsonArray users;
					if(data is JsonArray)
						users = (JsonArray)data;
					else {
						users = new JsonArray();
						users.Add(data);
					}
					foreach(JsonValue item in (JsonArray)data) {
						bool exists = false;
						// test if the user is not already in the group
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(*) FROM ugroup_user WHERE ugroup=@ugroup AND user=@user";
							dbcmd.Parameters.Add(new SqliteParameter("ugroup", id));
							dbcmd.Parameters.Add(new SqliteParameter("user", (string)item["id"]));
							object res = dbcmd.ExecuteScalar();
							if(res != null)
								exists = (Convert.ToInt64(res) > 0);
						}
						// insert in the group
						if(!exists) {
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "INSERT INTO ugroup_user (ugroup,user) VALUES (@ugroup,@user)";
								dbcmd.Parameters.Add(new SqliteParameter("ugroup", id));
								dbcmd.Parameters.Add(new SqliteParameter("user", (string)item["id"]));
								dbcmd.ExecuteNonQuery();
							}
						}
					}
					transaction.Commit();
				}
			}
		}

		////////////////////////////////////////////////////////////////////////////////
		// Handle file shares resource
		////////////////////////////////////////////////////////////////////////////////

		void GetShare(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy)
		{
			JsonValue json = storageService.GetStorageInfo(id);
			value["used"] = json["used"];
			value["quota"] = json["quota"];
			value["rev"] = json["rev"];
		}

		void CreateShare(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
			string id = (string)data["id"];
			storageService.CreateStorage(id, -1);
		}

		void ChangeShare(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue diff)
		{
			// nothing to do now
			storageService.ChangeStorage(id, diff);
		}

		void DeleteShare(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			storageService.DeleteStorage(id);
		}

		////////////////////////////////////////////////////////////////////////////////
		// Handle device resource
		////////////////////////////////////////////////////////////////////////////////

		void GetDevice(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy)
		{
			// get device in the group
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT path FROM device WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						if(reader.IsDBNull(0))
							value["path"] = null;
						else
							value["path"] = reader.GetString(0);
					}
				}
			}
		}

		void CreateDevice(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
			string id = (string)data["id"];

			// if no name set, generate a default one
			if(!data.ContainsKey("name") && data.ContainsKey("parent")) {
				List<string> names = new List<string>();

				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT name FROM resource WHERE parent=@parent";
					dbcmd.Parameters.Add(new SqliteParameter("parent", (string)data["parent"]));
					using(IDataReader reader = dbcmd.ExecuteReader()) {
						while(reader.Read()) {
							if(!reader.IsDBNull(0))
								names.Add(reader.GetString(0));
						}
						reader.Close();
					}
				}
				int integerName = 1;
				while(names.Contains(integerName.ToString())) {
					integerName++;
				}
				data["name"] = integerName.ToString();
			}

			string protocol = data.ContainsKey("protocol") ? (string)data["protocol"] : "web";
			string address = data.ContainsKey("address") ? (string)data["address"] : null;
			string password = data.ContainsKey("password") ? (string)data["password"] : null;
			string hwid = data.ContainsKey("hwid") ? (string)data["hwid"] : null;
			string path = data.ContainsKey("path") ? (string)data["path"] : null;

			// insert into devicetable
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "INSERT INTO device (id,protocol,address,password,hwid,path) VALUES (@id,@protocol,@address,@password,@hwid,@path)";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Parameters.Add(new SqliteParameter("protocol", protocol));
				dbcmd.Parameters.Add(new SqliteParameter("address", address));
				dbcmd.Parameters.Add(new SqliteParameter("password", password));
				dbcmd.Parameters.Add(new SqliteParameter("hwid", hwid));
				dbcmd.Parameters.Add(new SqliteParameter("path", path));
				if(dbcmd.ExecuteNonQuery() != 1)
					throw new Exception("Device create fails");
			}
		}

		void ChangeDevice(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue diff)
		{
			// update the device table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				StringBuilder sb = new StringBuilder();
				bool first = true;
				// handle strings
				foreach(string key in new string[]{ "protocol", "address", "password", "hwid", "path" }) {
					if(diff.ContainsKey(key)) {
						if(first)
							first = false;
						else
							sb.Append(",");
						sb.Append(key); sb.Append("=@"); sb.Append(key);
						dbcmd.Parameters.Add(new SqliteParameter(key, (string)diff[key]));
						((JsonObject)diff).Remove(key);
					}
				}
				if(!first) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE device SET " + sb.ToString() + " WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.ExecuteNonQuery();
				}
			}
		}

		void DeleteDevice(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			// delete from device table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM device WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}

			// delete from map_device table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM map_device WHERE device=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
		}

		public JsonValue GetDeviceByHwid(string hwid)
		{
			JsonValue res = null;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					string id = null;
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT id FROM device WHERE hwid=@hwid";
						dbcmd.Parameters.Add(new SqliteParameter("hwid", hwid));
						id = dbcmd.ExecuteScalar() as string;
					}
					if(id != null)
						res = GetResource(dbcon, transaction, id, null, 0);
				}
			}
			return res;
		}

		////////////////////////////////////////////////////////////////////////////////
		// Handle map resource
		////////////////////////////////////////////////////////////////////////////////

		void GetMap(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy)
		{
			// get device in the group
			JsonArray devices = new JsonArray();
			value["devices"] = devices;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT device,x,y FROM map_device WHERE map=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						JsonValue device = new JsonObject();
						device["device"] = reader.GetString(0);
						device["x"] = reader.GetFloat(1);
						device["y"] = reader.GetFloat(2);
						devices.Add(device);
					}
				}
			}
		}

		void CreateMap(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
		}

		void ChangeMap(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue diff)
		{
			// TODO

		}

		void DeleteMap(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			// delete from map_device table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM map_device WHERE map=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
		}

		public void MapRemoveDevices(string id, JsonValue data)
		{
			JsonValue oldValues;
			JsonValue newValues;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					oldValues = GetResource(dbcon, transaction, id, null, 0);

					if(data is JsonArray) {
						foreach(JsonValue item in (JsonArray)data) {
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "DELETE FROM map_device WHERE map=@map AND device=@device";
								dbcmd.Parameters.Add(new SqliteParameter("map", id));
								dbcmd.Parameters.Add(new SqliteParameter("device", (string)item["id"]));
								dbcmd.ExecuteNonQuery();
							}
						}
					}
					else {
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "DELETE FROM map_device WHERE map=@map AND device=@device";
							dbcmd.Parameters.Add(new SqliteParameter("map", id));
							dbcmd.Parameters.Add(new SqliteParameter("device", (string)data["id"]));
							dbcmd.ExecuteNonQuery();
						}
					}
					newValues = GetResource(dbcon, transaction, id, null, 0);
					transaction.Commit();
				}
			}
			NotifyChange(oldValues, newValues);
		}

		public void MapRemoveDevice(string id, string device)
		{
			JsonValue data = new JsonObject();
			data["id"] = device;
			MapRemoveDevices(id, data); 
		}

		public void MapAddDevices(string id, JsonValue data)
		{
			JsonValue oldValues;
			JsonValue newValues;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					oldValues = GetResource(dbcon, transaction, id, null, 0);

					if(data is JsonArray) {
						foreach(JsonValue item in (JsonArray)data) {
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "DELETE FROM map_device WHERE map=@map AND device=@device";
								dbcmd.Parameters.Add(new SqliteParameter("map", id));
								dbcmd.Parameters.Add(new SqliteParameter("device", (string)item["id"]));
								dbcmd.ExecuteNonQuery();
							}
							double x = item.ContainsKey("x")?(double)item["x"]:0;
							double y = item.ContainsKey("y")?(double)item["y"]:0;
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.Transaction = transaction;
								dbcmd.CommandText = "INSERT INTO map_device (map,device,x,y) VALUES (@map,@device,@x,@y)";
								dbcmd.Parameters.Add(new SqliteParameter("map", id));
								dbcmd.Parameters.Add(new SqliteParameter("device", (string)item["id"]));
								dbcmd.Parameters.Add(new SqliteParameter("x", x));
								dbcmd.Parameters.Add(new SqliteParameter("y", y));
								dbcmd.ExecuteNonQuery();
							}
						}
					}
					else {
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "DELETE FROM map_device WHERE map=@map AND device=@device";
							dbcmd.Parameters.Add(new SqliteParameter("map", id));
							dbcmd.Parameters.Add(new SqliteParameter("device", (string)data["id"]));
							dbcmd.ExecuteNonQuery();
						}
						double x = data.ContainsKey("x")?(double)data["x"]:0;
						double y = data.ContainsKey("y")?(double)data["y"]:0;
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "INSERT INTO map_device (map,device,x,y) VALUES (@map,@device,@x,@y)";
							dbcmd.Parameters.Add(new SqliteParameter("map", id));
							dbcmd.Parameters.Add(new SqliteParameter("device", (string)data["id"]));
							dbcmd.Parameters.Add(new SqliteParameter("x", x));
							dbcmd.Parameters.Add(new SqliteParameter("y", y));
							dbcmd.ExecuteNonQuery();
						}
					}
					newValues = GetResource(dbcon, transaction, id, null, 0);
					transaction.Commit();
				}
			}
			NotifyChange(oldValues, newValues);
		}

		public void MapSetImage(string map, string file) 
		{
			// convert in PNG
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/convert", file+" -auto-orient -strip png:"+basePath+"/maps/"+map);
			Process process = new Process();
			process.StartInfo = startInfo;
			process.Start();
			process.WaitForExit();
			process.Dispose();
		}

		public async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			////////////////////////////////////////////////////////////////////////////////
			/// handle generic part of the resources
			////////////////////////////////////////////////////////////////////////////////

			// WS /resource/[id]?seenBy=[user]
			if((parts.Length == 2) && (parts[0] == "resource") && context.Request.IsWebSocketRequest) {
				// accept the web socket and process it
				await context.AcceptWebSocketRequestAsync(new ResourceClient(this, parts[1]));
			}
			// GET /resource/[id]?depth=[depth]&seenBy=[user]
			else if((context.Request.Method == "GET") && (parts.Length == 2) && (parts[0] == "resource") && IsValidId(parts[1])) {
				int depth = 0;
				if(context.Request.QueryString.ContainsKey("depth"))
					depth = Math.Min(5, Math.Max(0, Convert.ToInt32(context.Request.QueryString["depth"])));
				string seenBy = null;
				if(context.Request.QueryString.ContainsKey("seenBy"))
					seenBy = context.Request.QueryString["seenBy"];
				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(GetResource(parts[1], seenBy, depth));
			}
			// GET /resource?query=[words]&seenBy=[user]
			else if((context.Request.Method == "GET") && (parts.Length == 1) && (parts[0] == "resource") && context.Request.QueryString.ContainsKey("seenBy")) {
				string seenBy = context.Request.QueryString["seenBy"];
				string query = "";
				if(context.Request.QueryString.ContainsKey("query"))
					query = context.Request.QueryString["query"];
				Dictionary<string,string> filters = new Dictionary<string, string>();
				foreach(string key in context.Request.QueryString.Keys) {
					if((key != "query") && (key != "seenBy"))
						filters[key] = context.Request.QueryString[key];
				}

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(SearchResources(query, filters, seenBy));
			}
			// POST /resource create a resource
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "resource")) {
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(CreateResource(await context.Request.ReadAsJsonAsync()));
			}
			// PUT /resource/[id] change a resource
			else if((context.Request.Method == "PUT") && (parts.Length == 2) && (parts[0] == "resource") && IsValidId(parts[1])) {
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(ChangeResource(parts[1], await context.Request.ReadAsJsonAsync()));
			}
			// DELETE /resource/[id]
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && (parts[0] == "resource") && IsValidId(parts[1])) {
				DeleteResource(parts[1]);
				context.Response.StatusCode = 200;
			}
			// POST /resource/[id]/rights change resource rights
			else if((context.Request.Method == "POST") && (parts.Length == 3) && (parts[0] == "resource") && IsValidId(parts[1]) && (parts[2] == "rights")) {
				AddResourceRights(parts[1], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// DELETE /resource/[id]/rights/[user] remove a user resource rights
			else if((context.Request.Method == "DELETE") && (parts.Length == 4) && (parts[0] == "resource") && IsValidId(parts[1]) && (parts[2] == "rights") && IsValidId(parts[3])) {
				JsonObject json = new JsonObject();
				json["user"] = parts[3];
				json["read"] = false;
				json["write"] = false;
				json["admin"] = false;
				AddResourceRights(parts[1], json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}

			////////////////////////////////////////////////////////////////////////////////
			/// handle users
			////////////////////////////////////////////////////////////////////////////////

			// GET /user[?firstname=firstname][&lastname=lastname][&description=description][&query=words] search
			if((context.Request.Method == "GET") && (parts.Length == 1) && (parts[0] == "user")) {
				string seenBy = null;
				if(context.Request.QueryString.ContainsKey("seenBy"))
					seenBy = context.Request.QueryString["seenBy"];
				string firstname = null;
				if(context.Request.QueryString.ContainsKey("firstname"))
					firstname = context.Request.QueryString["firstname"];
				string lastname = null;
				if(context.Request.QueryString.ContainsKey("lastname"))
					lastname = context.Request.QueryString["lastname"];
				string description = null;
				if(context.Request.QueryString.ContainsKey("description"))
					description = context.Request.QueryString["description"];
				string query = null;
				if(context.Request.QueryString.ContainsKey("query"))
					query = context.Request.QueryString["query"];
				int limit = 200;
				if(context.Request.QueryString.ContainsKey("limit"))
					limit = Math.Max(0, Math.Min(200, Convert.ToInt32(context.Request.QueryString["limit"])));

				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(SearchUsers(firstname, lastname, description, query, limit, seenBy));
			}
			// GET /user/[id]
			else if((context.Request.Method == "GET") && (parts.Length == 2) && (parts[0] == "user")) {
				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 1));
			}
			// POST /user create a user
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "user")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["type"] = "user";

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(CreateResource(json));
			}
			// PUT /user/[user] change user
			else if((context.Request.Method == "PUT") && (parts.Length == 2) && (parts[0] == "user") && IsValidId(parts[1])) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				ChangeResource(parts[1], json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// DELETE /user/[user] delete the user
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && (parts[0] == "user") && IsValidId(parts[1])) {
				DeleteResource(parts[1]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST /user/login
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[0] == "user") && (parts[1] == "login")) {
				JsonValue content = await context.Request.ReadAsJsonAsync();

				string login = (string)content["login"];
				string password = (string)content["password"];

				string foundPassword = null;
				string user = null;
				lock(dbcon) {
					// select from the user table
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT id,password FROM user WHERE login=@login";
						dbcmd.Parameters.Add(new SqliteParameter("login", login));
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							if(reader.Read()) {
								user = reader.GetString(0);
								if(!reader.IsDBNull(1)) {
									foundPassword = reader.GetString(1);
								}
							}
							reader.Close();
						}
					}
				}
				bool passwordGood = false;
				if(foundPassword != null) {
					int pos = foundPassword.IndexOf(':');
					if(pos == -1)
						passwordGood = (password == foundPassword);
					else {
						string method = foundPassword.Substring(0, pos);
						string subPassword = foundPassword.Substring(pos + 1);
						if(method == "clear")
							passwordGood = (password == subPassword);
						else if(method == "sha1") {
							System.Security.Cryptography.SHA1 hmac = System.Security.Cryptography.SHA1CryptoServiceProvider.Create();
							string sha1Password = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(password)));
							passwordGood = (sha1Password == subPassword);
						}
					}
				}
				// test the password
				if(passwordGood) {
					JsonValue authSession = authSessionService.Create(user);

					context.Response.StatusCode = 200;
					context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
					context.Response.Headers["set-cookie"] = authCookie + "=" + (string)authSession["id"] + "; Path=/";
					authSession["header"] = authHeader;
					context.Response.Content = new JsonContent(authSession);
				}
				else {
					context.Response.StatusCode = 403;
				}
			}
			// GET /user/[user]/face get the face
			else if((context.Request.Method == "GET") && (parts.Length == 3) && (parts[0] == "user") && IsValidId(parts[1]) && (parts[2] == "face")) {
				if(File.Exists(basePath + "/faces/" + parts[1])) {
					context.Response.StatusCode = 200;
					context.Response.Headers["cache-control"] = "max-age=" + cacheDuration;
					context.Response.Headers["content-type"] = "image/png";
					context.Response.Content = new FileContent(basePath + "/faces/" + parts[1]);
				}
				else {
					context.Response.StatusCode = 404;
					context.Response.Headers["cache-control"] = "max-age=" + cacheDuration;
				}
			}
			// POST /user/[user]/face upload the user face
			else if((context.Request.Method == "POST") && (parts.Length == 3) && (parts[0] == "user") && IsValidId(parts[1]) && (parts[2] == "face")) {

				string faceFile = null;
				if(context.Request.Headers["content-type"].StartsWith("multipart/form-data")) {
					MultipartReader reader = context.Request.ReadAsMultipart();
					MultipartPart part;
					while((part = reader.ReadPart()) != null) {
						// the file content
						if(part.Headers.ContentDisposition["name"] == "file") {
							faceFile = temporaryDirectory + "/" + Guid.NewGuid().ToString();
							using(FileStream fileStream = new FileStream(faceFile, FileMode.CreateNew, FileAccess.Write)) {
								part.Stream.CopyTo(fileStream);
							}
						}
					}
				}
				else {
					faceFile = temporaryDirectory + "/" + Guid.NewGuid().ToString();
					using(FileStream fileStream = new FileStream(faceFile, FileMode.CreateNew, FileAccess.Write)) {
						context.Request.InputStream.CopyTo(fileStream);
					}
				}
				if(faceFile != null)
					SetUserFace(parts[1], faceFile);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}

			////////////////////////////////////////////////////////////////////////////////
			/// handle user groups
			////////////////////////////////////////////////////////////////////////////////

			// GET /group/[id]
			else if((context.Request.Method == "GET") && (parts.Length == 2) && (parts[0] == "group")) {
				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// POST /group create a group
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "group")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["type"] = "group";

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(CreateResource(json));
			}
			// PUT /group/[group] change group
			else if((context.Request.Method == "PUT") && (parts.Length == 2) && (parts[0] == "group") && IsValidId(parts[1])) {
				ChangeResource(parts[1], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// POST /group/[group]/users add a user in the group
			else if((context.Request.Method == "POST") && (parts.Length == 3) && (parts[0] == "group") && IsValidId(parts[1]) && (parts[2] == "users")) {
				GroupAddUsers(parts[1], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// DELETE /group/[group]/users/[user] remove a user from the group
			else if((context.Request.Method == "DELETE") && (parts.Length == 4) && (parts[0] == "group") && IsValidId(parts[1]) && (parts[2] == "users") && IsValidId(parts[3])) {
				GroupRemoveUser(parts[1], parts[3]);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /group/[group]/users remove some users from the group
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && (parts[0] == "group") && IsValidId(parts[1]) && (parts[2] == "users")) {
				GroupRemoveUsers(parts[1], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /group/[group] delete the group
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && (parts[0] == "group") && IsValidId(parts[1])) {
				DeleteResource(parts[1]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}

			////////////////////////////////////////////////////////////////////////////////
			/// handle file shares
			////////////////////////////////////////////////////////////////////////////////

			// GET /share/[id]
			else if((context.Request.Method == "GET") && (parts.Length == 2) && (parts[0] == "share")) {
				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// POST /share create a file share
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "share")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["type"] = "share";

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(CreateResource(json));
			}
			// PUT /share/[share] change a file share
			else if((context.Request.Method == "PUT") && (parts.Length == 2) && (parts[0] == "share") && IsValidId(parts[1])) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				ChangeResource(parts[1], json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// DELETE /share/[share] delete the file share
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && (parts[0] == "share") && IsValidId(parts[1])) {
				DeleteResource(parts[1]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}

			////////////////////////////////////////////////////////////////////////////////
			/// handle devices
			////////////////////////////////////////////////////////////////////////////////

			// GET /device/[id]
			else if((context.Request.Method == "GET") && (parts.Length == 2) && (parts[0] == "device") && IsValidId(parts[1])) {
				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// POST /device create a device
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "device")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["type"] = "device";

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(CreateResource(json));
			}
			// PUT /device/[device] change a device
			else if((context.Request.Method == "PUT") && (parts.Length == 2) && (parts[0] == "device") && IsValidId(parts[1])) {
				ChangeResource(parts[1], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// DELETE /device/[device] delete the device
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && (parts[0] == "device") && IsValidId(parts[1])) {
				DeleteResource(parts[1]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// POST /device/login
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[0] == "device") && (parts[1] == "login")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				JsonValue device = null;

				if(json.ContainsKey("id")) {
					try {
						device = GetResource((string)json["id"], null, 0);
					}
					catch(WebException) {
						device = null;
					}
				}
				else if(json.ContainsKey("hwid")) {
					device = GetDeviceByHwid("hwid");
				}

				// test if fields has changed
				if(device != null) {
					// parents are differents, dont take the device
					if(json.ContainsKey("parent") && ((string)device["parent"] != (string)json["parent"]))
						device = null;
					// if hwid is different, dont take the device
					else if(json.ContainsKey("hwid") && ((string)device["hwid"] != (string)json["hwid"]))
						device = null;
				}
				// device is unknown, create a new one
				if(device == null) {
					json["type"] = "device";
					device = CreateResource(json);
				}

				JsonValue authSession = authSessionService.Create((string)device["id"]);
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.StatusCode = 200;
				context.Response.Headers["set-cookie"] = authCookie+"="+(string)authSession["id"]+"; Path=/";
				authSession["header"] = authHeader;
				authSession["device"] = device;
				context.Response.Content = new JsonContent(authSession);
			}

			////////////////////////////////////////////////////////////////////////////////
			/// handle maps
			////////////////////////////////////////////////////////////////////////////////

			// GET /map/[id]
			else if((context.Request.Method == "GET") && (parts.Length == 2) && (parts[0] == "map") && IsValidId(parts[1])) {
				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// POST /map create a map
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "map")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["type"] = "map";

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(CreateResource(json));
			}
			// PUT /map/[map] change a map
			else if((context.Request.Method == "PUT") && (parts.Length == 2) && (parts[0] == "map") && IsValidId(parts[1])) {
				ChangeResource(parts[1], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// GET /map/[map]/image get the map file
			else if((context.Request.Method == "GET") && (parts.Length == 3) && (parts[0] == "map") && (parts[2] == "image") && IsValidId(parts[1])) {
				if(File.Exists(basePath+"/maps/"+parts[1])) {
					context.Response.StatusCode = 200;
					context.Response.Headers["cache-control"] = "max-age="+cacheDuration;
					context.Response.Headers["content-type"] = "image/png";
					context.Response.Content = new FileContent(basePath+"/maps/"+parts[1]);
				}
				else {
					context.Response.StatusCode = 404;
					context.Response.Headers["cache-control"] = "max-age=" + cacheDuration;
				}
			}
			// POST /map/[map]/image set the map background
			else if((context.Request.Method == "POST") && (parts.Length == 3) && (parts[0] == "map") && (parts[2] == "image") && IsValidId(parts[1])) {
				string mapFile = null;
				if(context.Request.Headers["content-type"].StartsWith("multipart/form-data")) {
					MultipartReader reader = context.Request.ReadAsMultipart();
					MultipartPart part;
					while((part = reader.ReadPart()) != null) {
						// the file content
						if(part.Headers.ContentDisposition["name"] == "file") {
							mapFile = temporaryDirectory+"/"+Guid.NewGuid().ToString();
							using(FileStream fileStream = new FileStream(mapFile, FileMode.CreateNew, FileAccess.Write)) {
								part.Stream.CopyTo(fileStream);
							}
						}
					}
				}
				else {
					mapFile = temporaryDirectory+"/"+Guid.NewGuid().ToString();
					using(FileStream fileStream = new FileStream(mapFile, FileMode.CreateNew, FileAccess.Write)) {
						context.Request.InputStream.CopyTo(fileStream);
					}
				}
				if(mapFile != null)
					MapSetImage(parts[1], mapFile);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// POST /map/[map]/devices add a device in the map
			else if((context.Request.Method == "POST") && (parts.Length == 3) && (parts[0] == "map") && IsValidId(parts[1]) && (parts[2] == "devices")) {
				MapAddDevices(parts[1], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// PUT /map/[map]/devices/[device] change a device position in the map
			else if((context.Request.Method == "PUT") && (parts.Length == 4) && (parts[0] == "map") && (parts[2] == "devices") && IsValidId(parts[1]) && IsValidId(parts[3])) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["id"] = parts[3];
				MapAddDevices(parts[1], json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// DELETE /map/[map]/devices/[device] remove a device from the map
			else if((context.Request.Method == "DELETE") && (parts.Length == 4) && (parts[0] == "map") && IsValidId(parts[1]) && (parts[2] == "devices") && IsValidId(parts[3])) {
				MapRemoveDevice(parts[1], parts[3]);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /map/[map]/devices remove some devices from the map
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && (parts[0] == "map") && IsValidId(parts[1]) && (parts[2] == "devices")) {
				MapRemoveDevices(parts[1], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /map/[map] delete the map
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && (parts[0] == "map") && IsValidId(parts[1])) {
				DeleteResource(parts[1]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}

			////////////////////////////////////////////////////////////////////////////////
			/// handle folders
			////////////////////////////////////////////////////////////////////////////////

			// GET /folder/[id]
			else if((context.Request.Method == "GET") && (parts.Length == 2) && (parts[0] == "folder")) {
				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(GetResource(parts[1], null, 0));
			}
			// POST /folder create a folder
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "folder")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["type"] = "folder";

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(CreateResource(json));
			}
			// PUT /folder/[folder] change a folder
			else if((context.Request.Method == "PUT") && (parts.Length == 2) && (parts[0] == "folder") && IsValidId(parts[1])) {
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(ChangeResource(parts[1], await context.Request.ReadAsJsonAsync()));
			}
			// DELETE /folder/[folder] delete the folder
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && (parts[0] == "folder") && IsValidId(parts[1])) {
				DeleteResource(parts[1]);
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
		}

		public void Dispose()
		{
			if(dbcon != null) {
				dbcon.Close();
				dbcon.Dispose();
				dbcon = null;
			}
		}
	}
}

