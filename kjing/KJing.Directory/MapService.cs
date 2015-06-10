// MapService.cs
// 
//  Directory to reference all resources of KJing
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2013-2015 Departement du Rhone - Metropole de Lyon
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
using System.Data;
using System.Diagnostics;
using System.Collections.Generic;
using System.Threading.Tasks;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;

namespace KJing.Directory
{
	public class MapService: ResourceService
	{
		DirectoryService directory;
		IDbConnection dbcon;

		public MapService(DirectoryService directory): base(directory)
		{
			this.dbcon = directory.DbCon;
			this.directory = directory;
		}

		public override string Name {
			get {
				return "map";
			}
		}

		public override void Init(IDbConnection dbcon)
		{
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE map_device (map VARCHAR NOT NULL, device VARCHAR NOT NULL, "+
					"x REAL DEFAULT 0, y REAL DEFAULT 0)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE map (map VARCHAR NOT NULL, publicName VARCHAR DEFAULT NULL)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
		}
			
		public override void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, List<string> groups, Rights heritedRights, List<ResourceContext> parents, ResourceContext context)
		{
			// get the publicName
			value["publicName"] = null;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT publicName FROM map WHERE map=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						if(!reader.IsDBNull(0))
							value["publicName"] = reader.GetString(0);
					}
				}
			}

			JsonValue imageJson = directory.GetChildResourceByName(dbcon, transaction, id, "image", filterBy, groups, heritedRights, parents, context, false);
			if(imageJson != null)
				value["image"] = imageJson;

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

		public override void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
			string id = (string)data["id"];
			string publicName = null;

			if(data.ContainsKey("publicName")) {
				publicName = (string)data["publicName"];
				// check if the publicName is already used
				if(publicName != null) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT COUNT(map) FROM map WHERE publicName=@publicName";
						dbcmd.Parameters.Add(new SqliteParameter("publicName", publicName));
						int count = Convert.ToInt32(dbcmd.ExecuteScalar());
						if(count >= 1)
							throw new WebException(409, 0, "publicName already used, choose another one");
					}
				}
			}

			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "INSERT INTO map (map,publicName) VALUES (@map,@publicName)";
				dbcmd.Parameters.Add(new SqliteParameter("publicName", publicName));
				dbcmd.Parameters.Add(new SqliteParameter("map", id));
				dbcmd.ExecuteNonQuery();
			}
		}

			public override void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff, Dictionary<string, ResourceChange> changes)
		{
			if(diff.ContainsKey("publicName")) {
				string publicName = (string)diff["publicName"];
				// check if the publicName is already used
				if(publicName != null) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "SELECT COUNT(map) FROM map WHERE publicName=@publicName AND map != @map";
						dbcmd.Parameters.Add(new SqliteParameter("publicName", publicName));
						dbcmd.Parameters.Add(new SqliteParameter("map", id));
						int count = Convert.ToInt32(dbcmd.ExecuteScalar());
						if(count >= 1)
							throw new WebException(409, 0, "publicName already used, choose another one");
					}
				}

				bool found = false;
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(map) FROM map WHERE map = @map";
					dbcmd.Parameters.Add(new SqliteParameter("map", id));
					int count = Convert.ToInt32(dbcmd.ExecuteScalar());
					found = (count >= 1);
				}
				if(found) {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "UPDATE map SET publicName=@publicName WHERE map = @map";
						dbcmd.Parameters.Add(new SqliteParameter("publicName", publicName));
						dbcmd.Parameters.Add(new SqliteParameter("map", id));
						dbcmd.ExecuteNonQuery();
					}
				}
				else {
					using(IDbCommand dbcmd = dbcon.CreateCommand()) {
						dbcmd.Transaction = transaction;
						dbcmd.CommandText = "INSERT INTO map (map,publicName) VALUES (@map,@publicName)";
						dbcmd.Parameters.Add(new SqliteParameter("publicName", publicName));
						dbcmd.Parameters.Add(new SqliteParameter("map", id));
						dbcmd.ExecuteNonQuery();
					}
				}
			}
		}

		public override void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
			// delete from map_device table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM map_device WHERE map=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
			// delete from map table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM map WHERE map=@id";
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
					oldValues = directory.GetResource(dbcon, transaction, id, null);

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
					newValues = directory.GetResource(dbcon, transaction, id, null);
					transaction.Commit();
				}
			}
			directory.NotifyChange(oldValues, newValues);
		}

		public void MapRemoveDevice(string id, string device)
		{
			JsonValue data = new JsonObject();
			data["id"] = device;
			MapRemoveDevices(id, data); 
		}

		public void MapAddDevices(string id, JsonValue data)
		{
			Dictionary<string,ResourceChange> changes = new Dictionary<string, ResourceChange>();

			JsonValue oldValues;
			JsonValue newValues;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					oldValues = directory.GetResource(dbcon, transaction, id, null);

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
					directory.ChangeResource(dbcon, transaction, id, null, changes);

					newValues = directory.GetResource(dbcon, transaction, id, null);

					changes[id] = new ResourceChange {
						Before = oldValues,
						After = newValues
					};

					transaction.Commit();
				}
			}

			// notify the changes
			foreach(string resourceId in changes.Keys) {
				directory.NotifyChange(changes[resourceId].Before, changes[resourceId].After);
			}
		}

		public void MapSetImage(string map, string file) 
		{
			// convert in PNG
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/convert",
				file+" -auto-orient -strip png:"+directory.BasePath+"/maps/"+map);
			Process process = new Process();
			process.StartInfo = startInfo;
			process.Start();
			process.WaitForExit();
			process.Dispose();
		}

		public JsonArray GetPublicList()
		{
			JsonArray res;
			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {
					res = GetPublicList(dbcon, transaction);
				}
			}
			return res;
		}

		public JsonArray GetPublicList(IDbConnection dbcon, IDbTransaction transaction)
		{
			JsonArray res = new JsonArray();

			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT map,publicName FROM map WHERE publicName IS NOT NULL";
				dbcmd.Transaction = transaction;
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					while(reader.Read()) {
						if(!reader.IsDBNull(0)) {
							string mapId = reader.GetString(0);
							res.Add(GetResource(mapId, null));
						}
					}
				}
			}
			return res;
		}

		public override async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// GET /public get the list of public maps
			if((context.Request.Method == "GET") && (parts.Length == 1) && (parts[0] == "public")) {
				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(GetPublicList());
			}
			// POST /[map]/image set the map background
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "image") && IsValidId(parts[0])) {

				directory.EnsureRights(context, parts[0], false, true, false);

				FileDefinition fileDefinition = await directory.GetFileDefinitionAsync(context);

				// check if it is really an image
				if(!((string)fileDefinition.Define["mimetype"]).StartsWith("image/"))
					throw new WebException(400, 0, "Invalid file. Expecting an image");
				// force the parent
				fileDefinition.Define["parent"] = parts[0];
				// force the file name
				fileDefinition.Define["name"] = "image";
				// the image name is MUST be unique. Only one map image can be set
				fileDefinition.Define["uniqueName"] = true;

				JsonValue jsonFile = await directory.CreateFileAsync(fileDefinition);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(jsonFile);
			}
			// POST /[map]/devices add a device in the map
			else if((context.Request.Method == "POST") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "devices")) {
				directory.EnsureRights(context, parts[0], false, true, false);

				MapAddDevices(parts[0], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(directory.GetResource(parts[0], null));
			}
			// PUT /[map]/devices/[device] change a device position in the map
			else if((context.Request.Method == "PUT") && (parts.Length == 3) && (parts[1] == "devices") && IsValidId(parts[0]) && IsValidId(parts[2])) {

				directory.EnsureRights(context, parts[0], false, true, false);

				JsonValue json = await context.Request.ReadAsJsonAsync();
				json["id"] = parts[2];
				MapAddDevices(parts[0], json);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(directory.GetResource(parts[0], null));
			}
			// DELETE /[map]/devices/[device] remove a device from the map
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && IsValidId(parts[0]) && (parts[1] == "devices") && IsValidId(parts[2])) {
				directory.EnsureRights(context, parts[0], false, true, false);

				MapRemoveDevice(parts[0], parts[2]);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /[map]/devices remove some devices from the map
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "devices")) {
				directory.EnsureRights(context, parts[0], false, true, false);

				MapRemoveDevices(parts[0], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			else
				await base.ProcessRequestAsync(context);
		}
	}
}

