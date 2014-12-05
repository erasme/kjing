﻿// ResourceService.cs
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
using System.Data;
using System.Text;
using System.Text.RegularExpressions;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;
using Erasme.Cloud.Logger;

namespace KJing.Directory
{
	public static class DateTimeUnix
	{
		public static readonly DateTime UnixEpoch = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);

		public static long ToEpoch(this DateTime date)
		{
			return (date - UnixEpoch).Ticks / TimeSpan.TicksPerMillisecond;
		}

		public static DateTime ToDateTime(long ticks)
		{
			return UnixEpoch + TimeSpan.FromMilliseconds(ticks);
		}
	}

	public struct ResourceRights 
	{
		public string Id;
		public bool PublicRead;
		public bool PublicWrite;
		public bool PublicAdmin;
	}

	public class ResourceService: IService
	{
		DirectoryService directory;
		IDbConnection dbcon;
		ILogger logger;

		object instanceLock = new object();
		Dictionary<string, WebSocketHandlerCollection<ResourceClient>> clients = new Dictionary<string, WebSocketHandlerCollection<ResourceClient>>();

		public class ResourceClient: WebSocketHandler
		{
			object instanceLock = new object();
			JsonValue values = null;

			public ResourceClient(ResourceService service, string resource)
			{
				Service = service;
				Resource = resource;
			}

			public ResourceService Service { get; private set; }

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
				// send open message
				JsonValue json = new JsonObject();
				json["type"] = "open";
				json["connection"] = Id;
				Send(json.ToString());
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

		public ResourceService(DirectoryService directory)
		{
			this.directory = directory;
			this.dbcon = directory.DbCon;
			this.logger = directory.Logger;
		}

		public DirectoryService Directory {
			get {
				return directory;
			}
		}

		public Dictionary<string,IService> ResourceTypes {
			get {
				return directory.ResourceTypes;
			}
		}

		public virtual string Name {
			get {
				return "resource";
			}
		}

		public virtual void Init(IDbConnection dbcon)
		{
			// create resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE resource ("+
					"id VARCHAR PRIMARY KEY, type VARCHAR NOT NULL, parent VARCHAR DEFAULT NULL,"+
					"name VARCHAR DEFAULT NULL, ctime INTEGER, mtime INTEGER, rev INTEGER DEFAULT 0, "+
					"cache INTEGER(1) DEFAULT 0, publicRead INTEGER(1) DEFAULT 0, "+
					"publicWrite INTEGER(1) DEFAULT 0, publicAdmin INTEGER(1) DEFAULT 0, "+
					"position INTEGER DEFAULT 0)";
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
		}

		public virtual void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceRights> parents)
		{
		}

		public virtual void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
		}

		public virtual void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff)
		{
		}

		public virtual void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data)
		{
		}

		public string GenerateRandomId(int size = 10)
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

		public string TypeFreeId(string id)
		{
			return id.Substring(id.IndexOf(':') + 1);
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
				string jsonString = json.ToString();
				foreach(ResourceClient client in handlers) {
					if(client.Id == destination) {
						client.Send(jsonString);
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
					if(newValues != null)
						json["rev"] = (long)newValues["rev"];
					else if(oldValues != null)
						json["rev"] = (long)oldValues["rev"] + 1;
					handlers.Broadcast(json.ToString());
				}
			}
			//			Console.WriteLine("NotifyChange Id: "+resource+", Interested: "+interestedIds);
		}

		public Rights GetResourceOwnRights(string id, string user)
		{
			Rights ownRights;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					Dictionary<string, Rights> delegatedRights = GetDelegatedRights(dbcon, transaction, user);
					List<string> groups = new List<string>();
					GetUserGroups(dbcon, transaction, user, groups);
					List<ResourceRights> parents;
					ownRights = GetResourceOwnRights(dbcon, transaction, id, user, groups, delegatedRights, out parents);
					transaction.Commit();
				}
			}
			return ownRights;
		}

		Rights GetResourceOwnRights(IDbConnection dbcon, IDbTransaction transaction, string id, string user, List<string> groups, Dictionary<string,Rights> delegatedRights, out List<ResourceRights> parents)
		{
			parents = new List<ResourceRights>();

			string current = id;
			do {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.CommandText = "SELECT parent,publicRead,publicWrite,publicAdmin FROM resource WHERE id=@id";
					dbcmd.Transaction = transaction;
					dbcmd.Parameters.Add(new SqliteParameter("id", current));
					using(IDataReader reader = dbcmd.ExecuteReader()) {
						if(!reader.Read())
							throw new WebException(404, 0, "Resource not found");
						ResourceRights resourceRights = new ResourceRights();
						resourceRights.Id = current;
						resourceRights.PublicRead = reader.GetBoolean(1);
						resourceRights.PublicWrite = reader.GetBoolean(2);
						resourceRights.PublicAdmin = reader.GetBoolean(3);
						parents.Add(resourceRights);

						if(reader.IsDBNull(0))
							current = null;
						else
							current = reader.GetString(0);

					}
				}
			} while(current != null);

			parents.Reverse();
			Rights heritedRights;

			// special case, no user == admin
			if(user == null) {
				heritedRights = new Rights(true, true, true);
			}
			else {
				heritedRights = new Rights(false, false, false);

				foreach(ResourceRights resourceRights in parents) {
					if(delegatedRights.ContainsKey(resourceRights.Id)) {
						heritedRights.Read |= delegatedRights[resourceRights.Id].Read;
						heritedRights.Write |= delegatedRights[resourceRights.Id].Write;
						heritedRights.Admin |= delegatedRights[resourceRights.Id].Admin;
					}
					if(resourceRights.Id == user) {
						heritedRights.Read = true;
						heritedRights.Write = true;
						heritedRights.Admin = true;
					}
					heritedRights.Read |= resourceRights.PublicRead;
					heritedRights.Write |= resourceRights.PublicWrite;
					heritedRights.Admin |= resourceRights.PublicAdmin;

					// check rights attached to this resource
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.CommandText = "SELECT user,read,write,admin FROM right WHERE resource=@resource";
						dbcmd.Parameters.Add(new SqliteParameter("resource", resourceRights.Id));
						dbcmd.Transaction = transaction;
						using(IDataReader reader = dbcmd.ExecuteReader()) {
							while(reader.Read()) {
								string rightUser = reader.GetString(0);
								bool read = reader.GetBoolean(1);
								bool write = reader.GetBoolean(2);
								bool admin = reader.GetBoolean(3);

								if((rightUser == user) || groups.Contains(rightUser)) {
									heritedRights.Read |= read;
									heritedRights.Write |= write;
									heritedRights.Admin |= admin;
								}
							}
						}
					}
				}
			}
			parents.RemoveAt(parents.Count - 1);
			return heritedRights;
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

		public JsonValue GetResource(IDbConnection dbcon, IDbTransaction transaction, string id, string filterBy, int depth)
		{
			List<string> groups = null;
			Rights heritedRights = new Rights(false, false, false);
			Rights ownRights;
			List<ResourceRights> parents;

			if(filterBy != null) {
				Dictionary<string, Rights> delegatedRights = GetDelegatedRights(dbcon, transaction, filterBy);
				groups = new List<string> ();
				GetUserGroups (dbcon, transaction, filterBy, groups);
				heritedRights = GetResourceOwnRights(dbcon, transaction, id, filterBy, groups, delegatedRights, out parents);
			}
			else
				heritedRights = GetResourceOwnRights(dbcon, transaction, id, filterBy, null, null, out parents);

			//Console.WriteLine("GetResource id: " + id + ", filterBy: " + filterBy + ", heritedRight: " + heritedRights);
			return GetResource(dbcon, transaction, id, filterBy, depth, groups, heritedRights, out ownRights, parents);
		}

		Dictionary<string, Rights> GetDelegatedRights(IDbConnection dbcon, IDbTransaction transaction, string user)
		{
			Dictionary<string, Rights> rights = new Dictionary<string, Rights>();
			if(user.StartsWith("device:")) {
				JsonValue device = GetResource(user, null, 0);
				if(device.ContainsKey("path") && ((string)device["path"] != null)) {
					string path = (string)device["path"];
//					if(path.StartsWith("file:")) {
//						path = path.Substring(5, path.LastIndexOf(":") - 5);
//					}
					//Console.WriteLine("GetDeletagedRights share: " + path);
					rights[path] = new Rights(true, false, false);
				}
			}
			return rights;
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
						bool read = reader.GetBoolean(1);
						bool write = reader.GetBoolean(2);
						bool admin = reader.GetBoolean(3);
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

		JsonValue GetResource(IDbConnection dbcon, IDbTransaction transaction, string id, string filterBy, int depth, List<string> groups, Rights heritedRights, out Rights ownRights, List<ResourceRights> parents)
		{
			JsonValue resource = new JsonObject();
			string type;
			// select from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id,type,name,parent,ctime,mtime,rev,cache,"+
					"publicRead,publicWrite,publicAdmin,position FROM resource WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(!reader.Read())
						throw new WebException(404, 0, "Resource not found");
					resource["id"] = reader.GetString(0);
					type = reader.GetString(1);
					resource["type"] = type;
					if(reader.IsDBNull(2))
						resource["name"] = null;
					else
						resource["name"] = reader.GetString(2);
					if(reader.IsDBNull(3))
						resource["parent"] = null;
					else
						resource["parent"] = reader.GetString(3);

					JsonArray jsonParents = new JsonArray();
					foreach(ResourceRights rRights in parents)
						jsonParents.Add(rRights.Id);
					resource["parents"] = jsonParents;

					// TODO: improve this. Who is the owner: the root or the first user parent
					if(parents.Count > 0)
						resource["owner"] = parents[0].Id;
					else
						resource["owner"] = id;

					if(reader.IsDBNull(4))
						resource["ctime"] = 0;
					else
						resource["ctime"] = reader.GetInt64(4);
					if(reader.IsDBNull(5))
						resource["mtime"] = 0;
					else
						resource["mtime"] = reader.GetInt64(5);
					resource["rev"] = reader.GetInt64(6);
					resource["cache"] = reader.GetBoolean(7);
					resource["publicRead"] = reader.GetBoolean(8);
					resource["publicWrite"] = reader.GetBoolean(9);
					resource["publicAdmin"] = reader.GetBoolean(10);
					resource["position"] = reader.GetInt64(11) / 2;
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

				ownRights.Read |= (bool)resource["publicRead"];
				ownRights.Write |= (bool)resource["publicWrite"];
				ownRights.Admin |= (bool)resource["publicAdmin"];

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

			if(directory.ResourceTypes.ContainsKey(type))
				directory.ResourceTypes[type].Get(dbcon, transaction, id, resource, filterBy, depth, groups, ownRights, parents);

			// get child resources
			if(depth > 0) {
				ResourceRights rRights = new ResourceRights();
				rRights.Id = id;
				rRights.PublicRead = (bool)resource["publicRead"];
				rRights.PublicWrite = (bool)resource["publicWrite"];
				rRights.PublicAdmin = (bool)resource["publicAdmin"];
				parents.Add(rRights);

				JsonArray allResources = GetResources(dbcon, transaction, id, filterBy, depth - 1, groups, ownRights, parents);
				JsonArray cache = new JsonArray();
				JsonArray children = new JsonArray();
				foreach(JsonValue r in allResources) {
					if((bool)r["cache"])
						cache.Add(r);
					else
						children.Add(r);
				}
				resource["children"] = children;
				resource["cache"] = cache;
			}
			return resource;
		}

		public JsonArray GetResources(IDbConnection dbcon, IDbTransaction transaction, string parent, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceRights> parents)
		{
			JsonArray resources = new JsonArray();

			// select from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id FROM resource WHERE parent=@parent ORDER BY position ASC";
				dbcmd.Parameters.Add(new SqliteParameter("parent", parent));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						if(!reader.IsDBNull(0)) {
							Rights ownRights;
							JsonValue json = GetResource(dbcon, transaction, reader.GetString(0), filterBy, depth, groups, heritedRights, out ownRights, parents);
							// filter the resource by what the filterBy user can view
							if((filterBy == null) || ((bool)json["ownRights"]["read"]))
								resources.Add(json);
						}
					}
				}
			}
			return resources;
		}

		public JsonValue GetChildResourceByName(IDbConnection dbcon, IDbTransaction transaction, string parent, string name, bool cache)
		{
			JsonValue resource = null;
			// select from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id FROM resource WHERE parent=@parent AND name=@name AND cache=@cache";
				dbcmd.Parameters.Add(new SqliteParameter("parent", parent));
				dbcmd.Parameters.Add(new SqliteParameter("name", name));
				dbcmd.Parameters.Add(new SqliteParameter("cache", cache));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(reader.Read() && !reader.IsDBNull(0))
						resource = GetResource(dbcon, transaction, reader.GetString(0), null, 0);
				}
			}
			return resource;
		}

		public JsonValue GetChildResourceByName(IDbConnection dbcon, IDbTransaction transaction, string parent, string name, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceRights> parents, bool cache)
		{
			JsonValue resource = null;

			// select from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id FROM resource WHERE parent=@parent AND name=@name AND cache=@cache";
				dbcmd.Parameters.Add(new SqliteParameter("parent", parent));
				dbcmd.Parameters.Add(new SqliteParameter("name", name));
				dbcmd.Parameters.Add(new SqliteParameter("cache", cache));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(reader.Read() && !reader.IsDBNull(0)) {
						Rights ownRights;
						JsonValue json = GetResource(dbcon, transaction, reader.GetString(0), filterBy, depth, groups, heritedRights, out ownRights, parents);
						// filter the resource by what the filterBy user can view
						if((filterBy == null) || ((bool)json["ownRights"]["read"]))
							resource = json;
					}
				}
			}
			return resource;
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

		public JsonArray GetUserShares(IDbConnection dbcon, IDbTransaction transaction, string user, int depth, List<string> groups)
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


		void CleanPositions(IDbConnection dbcon, IDbTransaction transaction, string parent)
		{
			List<string> resources = new List<string>();
			// get all files of a directory
			long i = 0;
			bool cleanNeeded = false;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT id,position FROM resource WHERE parent=@parent ORDER BY position ASC";
				dbcmd.Parameters.Add(new SqliteParameter("parent", parent));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						resources.Add(reader.GetString(0));
						cleanNeeded |= (reader.GetInt64(1) != (i * 2)+1);
						i++;
					}
					reader.Close();
				}
			}
			// update the files positions
			if(cleanNeeded) {
				i = 0;
				foreach(string resource in resources) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "UPDATE resource SET position=@position WHERE id=@resource";
						dbcmd.Parameters.Add(new SqliteParameter("resource", resource));
						dbcmd.Parameters.Add(new SqliteParameter("position", (i * 2)+1));
						dbcmd.ExecuteNonQuery();
					}
					i++;
				}
			}
		}

		public JsonValue CreateResource(JsonValue data)
		{
			JsonValue removeResource = null;
			string parent = null;
			if(data.ContainsKey("parent"))
				parent = data["parent"];
			string name = null;
			if(data.ContainsKey("name"))
				parent = data["name"];
			bool cache = false;
			if(data.ContainsKey("cache"))
				cache = data["cache"];
			bool uniqueName = data.ContainsKey("uniqueName") && (bool)data["uniqueName"];

			JsonValue json;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					if(uniqueName)
						removeResource = GetChildResourceByName(dbcon, transaction, parent, name, null, 0, null, new Rights(), null, cache);
					string id = CreateResource(dbcon, transaction, data);
					json = GetResource(dbcon, transaction, id, null, 0);
					if(removeResource != null)
						DeleteResource(dbcon, transaction, removeResource["id"]);
					transaction.Commit();
				}
			}
			NotifyChange(null, json);
			if(removeResource != null)
				NotifyChange(removeResource, null);
			return json;
		}

		public string CreateResource(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
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

			if(ResourceTypes.ContainsKey(type))
				ResourceTypes[type].Create(dbcon, transaction, data);

			string parent = null;
			if(data.ContainsKey("parent"))
				parent = (string)data["parent"];
			string name = null;
			if(data.ContainsKey("name"))
				name = (string)data["name"];
			bool cache = false;
			if(data.ContainsKey("cache") && (bool)data["cache"])
				cache = true;

			bool publicRead = false;
			if(data.ContainsKey("publicRead") && (bool)data["publicRead"])
				publicRead = true;
			bool publicWrite = false;
			if(data.ContainsKey("publicWrite") && (bool)data["publicWrite"])
				publicWrite = true;
			bool publicAdmin = false;
			if(data.ContainsKey("publicAdmin") && (bool)data["publicAdmin"])
				publicAdmin = true;
			long position = 0;
			if(data.ContainsKey("position"))
				position = data["position"] * 2;

			long now = DateTime.Now.ToEpoch();
			// insert into resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "INSERT INTO resource (id,type,ctime,mtime,parent,name,rev,cache,publicRead,publicWrite,publicAdmin,position) "+
					"VALUES (@id,@type,@ctime,@mtime,@parent,@name,0,@cache,@publicRead,@publicWrite,@publicAdmin,@position)";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Parameters.Add(new SqliteParameter("type", type));
				dbcmd.Parameters.Add(new SqliteParameter("ctime", now));
				dbcmd.Parameters.Add(new SqliteParameter("mtime", now));
				dbcmd.Parameters.Add(new SqliteParameter("parent", parent));
				dbcmd.Parameters.Add(new SqliteParameter("name", name));
				dbcmd.Parameters.Add(new SqliteParameter("cache", cache));
				dbcmd.Parameters.Add(new SqliteParameter("publicRead", publicRead));
				dbcmd.Parameters.Add(new SqliteParameter("publicWrite", publicWrite));
				dbcmd.Parameters.Add(new SqliteParameter("publicAdmin", publicAdmin));
				dbcmd.Parameters.Add(new SqliteParameter("position", position));

				if(dbcmd.ExecuteNonQuery() != 1)
					throw new Exception("Resource create fails");
			}
			// clean the parent childs positions
			if(parent != null)
				CleanPositions(dbcon, transaction, parent);

			return id;
			//return GetResource(dbcon, transaction, id, null, 0);
		}

		public JsonValue ChangeResource(string id, JsonValue diff)
		{
			JsonValue jsonOld;
			JsonValue jsonNew;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					jsonOld = GetResource(dbcon, transaction, id, null, 0);
					ChangeResource(dbcon, transaction, id, jsonOld, diff);
					jsonNew = GetResource(dbcon, transaction, id, null, 0);
					transaction.Commit();
				}
			}
			// notify the current resource change
			NotifyChange(jsonOld, jsonNew);
			return jsonNew;
		}

		public void ChangeResource(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff)
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

			string newParentId = null;
			string oldParentId = data["parent"];
			// handle parent resource field
			// ATTENTION: might create problem the day a quota system will exists
			if(diff.ContainsKey("parent") && (data["parent"] != diff["parent"])) {
				newParentId = diff["parent"];
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

			// handle publicRead resource field
			if(diff.ContainsKey("publicRead")) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE resource SET publicRead=@publicRead WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("publicRead", (bool)diff["publicRead"]));
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.ExecuteNonQuery();
				}
			}

			// handle publicWrite resource field
			if(diff.ContainsKey("publicWrite")) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE resource SET publicWrite=@publicWrite WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("publicWrite", (bool)diff["publicWrite"]));
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.ExecuteNonQuery();
				}
			}

			// handle publicAdmin resource field
			if(diff.ContainsKey("publicAdmin")) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE resource SET publicAdmin=@publicAdmin WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("publicAdmin", (bool)diff["publicAdmin"]));
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.ExecuteNonQuery();
				}
			}

			// handle position resource field
			long oldPosition = data["position"];
			long newPosition = -1;
			if(diff.ContainsKey("position")) {
				newPosition = diff["position"];

				long tmpPosition = 0;
				if(newPosition <= oldPosition)
					tmpPosition = newPosition*2;
				else
					tmpPosition = (newPosition+1)*2;

				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE resource SET position=@position WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("position", tmpPosition));
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.ExecuteNonQuery();
				}
			}

			// clean parents childs positions if needed (parent change or/and new position)
			if((newParentId != null) && (newParentId != oldParentId)) {
				CleanPositions(dbcon, transaction, oldParentId);
				CleanPositions(dbcon, transaction, newParentId);
			}
			else if((newPosition != -1) && (newPosition != oldPosition))
				CleanPositions(dbcon, transaction, oldParentId);

			if(ResourceTypes.ContainsKey(type))
				ResourceTypes[type].Change(dbcon, transaction, id, data, diff);

			long now = DateTime.Now.ToEpoch();
			// update the rev and mtime fields
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "UPDATE resource SET rev=rev+1,mtime=@mtime WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Parameters.Add(new SqliteParameter("mtime", now));
				dbcmd.ExecuteNonQuery();
			}
		}

		public void DeleteResource(string id)
		{
			JsonValue jsonResource;

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					jsonResource = GetResource(dbcon, transaction, id, null, 0);
					DeleteResource(dbcon, transaction, id, jsonResource);
					transaction.Commit();
				}
			}
			// notify the change
			NotifyChange(jsonResource, null);
		}

		public void DeleteResource(IDbConnection dbcon, IDbTransaction transaction, string id)
		{
			JsonValue jsonResource = GetResource(dbcon, transaction, id, null, 0);
			DeleteResource(dbcon, transaction, id, jsonResource);
		}

		public void DeleteResource(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data)
		{
			// delete children first
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT id FROM resource WHERE parent=@parent";
				dbcmd.Parameters.Add(new SqliteParameter("parent", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						if(!reader.IsDBNull(0))
							DeleteResource(dbcon, transaction, reader.GetString(0));
					}
				}
			}

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

			if(ResourceTypes.ContainsKey(type))
				ResourceTypes[type].Delete(dbcon, transaction, id, data);

			// delete from the resource table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM resource WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				if(dbcmd.ExecuteNonQuery() != 1)
					throw new Exception("Resource delete fails");
			}

			// clean the parent childs positions
			string parent = (string)data["parent"];
			if(parent != null)
				CleanPositions(dbcon, transaction, parent);
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

		public virtual async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// WS /[id]
			if((parts.Length == 1) && context.Request.IsWebSocketRequest && IsValidId(parts[0])) {
				directory.EnsureRights(context, parts[0], true, false, false);

				// accept the web socket and process it
				await context.AcceptWebSocketRequestAsync(new ResourceClient(this, parts[0]));
			}
			// GET /[id]?depth=[depth]&seenBy=[user]
			else if((context.Request.Method == "GET") && (parts.Length == 1) && IsValidId(parts[0])) {
				directory.EnsureRights(context, parts[0], true, false, false);

				int depth = 0;
				if(context.Request.QueryString.ContainsKey("depth"))
					depth = Math.Min(5, Math.Max(0, Convert.ToInt32(context.Request.QueryString["depth"])));
				string seenBy = null;
				if(context.Request.QueryString.ContainsKey("seenBy"))
					seenBy = context.Request.QueryString["seenBy"];
				context.Response.StatusCode = 200;
				context.Response.Content = new JsonContent(GetResource(parts[0], seenBy, depth));
			}
			// GET /?query=[words]&seenBy=[user]
			else if((context.Request.Method == "GET") && (parts.Length == 0) && context.Request.QueryString.ContainsKey("seenBy")) {
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
			// POST / create a resource
			else if((context.Request.Method == "POST") && (parts.Length == 0)) {
				JsonValue json = await context.Request.ReadAsJsonAsync();

				if(!json.ContainsKey("type"))
					throw new WebException(400, 0, "Resource \"type\" is needed to create a new resource");
				if(!json.ContainsKey("parent") && ((string)json["type"] != "user"))
					throw new WebException(400, 0, "Resource that are not users need a parent resource");
				// check rights on the parent
				if(json.ContainsKey("parent"))
					directory.EnsureRights(context, (string)json["parent"], false, true, false);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(CreateResource(json));
			}
			// PUT /[id] change a resource
			else if((context.Request.Method == "PUT") && (parts.Length == 1) && IsValidId(parts[0])) {
				directory.EnsureRights(context, parts[0], false, true, false);
				JsonValue json = await context.Request.ReadAsJsonAsync();
				// if we change the parent, check if we have the right on the new parent
				if(json.ContainsKey("parent"))
					directory.EnsureRights(context, json["parent"], false, true, false);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(ChangeResource(parts[0], json));
			}
			// DELETE /[id]
			else if((context.Request.Method == "DELETE") && (parts.Length == 1) && IsValidId(parts[0])) {
				directory.EnsureRights(context, parts[0], false, true, false);

				DeleteResource(parts[0]);
				context.Response.StatusCode = 200;
			}
			// POST /[id]/rights change resource rights
			else if((context.Request.Method == "POST") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "rights")) {
				directory.EnsureRights(context, parts[0], false, false, true);

				AddResourceRights(parts[0], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[0], null, 0));
			}
			// DELETE /[id]/rights/[user] remove a user resource rights
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && IsValidId(parts[0]) && (parts[1] == "rights") && IsValidId(parts[2])) {
				directory.EnsureRights(context, parts[0], false, false, true);

				JsonObject json = new JsonObject();
				json["user"] = parts[2];
				json["read"] = false;
				json["write"] = false;
				json["admin"] = false;
				AddResourceRights(parts[0], json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetResource(parts[0], null, 0));
			}
			// GET /[id]/ownRights?seenBy=[user]
			else if((context.Request.Method == "GET") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "ownRights") && context.Request.QueryString.ContainsKey("seenBy")) {

				string seenBy = context.Request.QueryString["seenBy"];
				JsonObject ownRightsJson = new JsonObject();
				Rights ownRights = GetResourceOwnRights(parts[0], seenBy);
				ownRightsJson["read"] = ownRights.Read;
				ownRightsJson["write"] = ownRights.Write;
				ownRightsJson["admin"] = ownRights.Admin;

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(ownRightsJson);
			}
		}

	}
}

