// Device.cs
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
using System.Text;
using System.Data;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;

namespace KJing.Directory
{
	public class DeviceService: ResourceService
	{
		IDbConnection dbcon;
		DirectoryService directory;

		public DeviceService(DirectoryService directory): base(directory)
		{
			this.dbcon = directory.DbCon;
			this.directory = directory;
		}

		public override string Name {
			get {
				return "device";
			}
		}

		public override void Init(IDbConnection dbcon)
		{
			// create the device table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE device (id VARCHAR PRIMARY KEY NOT NULL, path VARCHAR, "+
					"hwid VARCHAR DEFAULT NULL, loop INTEGER(1) DEFAULT 1, protocol VARCHAR DEFAULT 'web',"+
					"address VARCHAR DEFAULT NULL, password VARCHAR DEFAULT NULL)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
		}

		public override void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, List<string> groups, Rights heritedRights, List<ResourceContext> parentsr, ResourceContext context)
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
					reader.Close();
				}
			}
		}

		public override void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, Dictionary<string, ResourceChange> changes)
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

		public override void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff, Dictionary<string, ResourceChange> changes)
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

		public override void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, Dictionary<string, ResourceChange> changes)
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
						res = directory.GetResource(dbcon, transaction, id, null);
				}
			}
			return res;
		}

		public override async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// POST /login
			if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "login")) {
				JsonValue json = await context.Request.ReadAsJsonAsync();
				JsonValue device = null;

				if(json.ContainsKey("id")) {
					try {
						device = directory.GetResource((string)json["id"], null);
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
					device = directory.CreateResource(json);
				}

				JsonValue authSession = directory.AuthSessionService.Create((string)device["id"]);
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.StatusCode = 200;
				context.Response.Headers["set-cookie"] = directory.AuthCookie+"="+(string)authSession["id"]+"; Path=/";
				authSession["header"] = directory.AuthHeader;
				authSession["device"] = device;
				context.Response.Content = new JsonContent(authSession);
			}
			else
				await base.ProcessRequestAsync(context);
		}
	}
}

