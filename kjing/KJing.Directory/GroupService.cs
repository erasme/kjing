// GroupService.cs
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
using System.Data;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;

namespace KJing.Directory
{
	public class GroupService: ResourceService
	{
		DirectoryService directory;
		IDbConnection dbcon;

		public GroupService(DirectoryService directory): base(directory)
		{
			this.dbcon = directory.DbCon;
			this.directory = directory;
		}

		public override string Name {
			get {
				return "group";
			}
		}

		public override void Init(IDbConnection dbcon)
		{
			// create ugroup_user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE ugroup_user (ugroup VARCHAR NOT NULL, user VARCHAR NOT NULL)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
		}

		public override void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceContext> parents)
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

		public override void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
		}

		public override void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff)
		{
		}

		public override void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data)
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
			Dictionary<string,ResourceChange> changes = new Dictionary<string, ResourceChange>();

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {

					JsonValue before = GetResource(dbcon, transaction, id, null, 0);

					if(data is JsonArray) {
						foreach(string user in (JsonArray)data) {
							using(IDbCommand dbcmd = dbcon.CreateCommand()) {
								dbcmd.CommandText = "DELETE FROM ugroup_user WHERE ugroup=@id AND user=@user";
								dbcmd.Parameters.Add(new SqliteParameter("id", id));
								dbcmd.Parameters.Add(new SqliteParameter("user", user));
								dbcmd.ExecuteNonQuery();
							}
						}
					}
					else {
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.CommandText = "DELETE FROM ugroup_user WHERE ugroup=@id AND user=@user";
							dbcmd.Parameters.Add(new SqliteParameter("ugroup", id));
							dbcmd.Parameters.Add(new SqliteParameter("user", (string)data));
							dbcmd.ExecuteNonQuery();
						}
					}

					JsonValue after = Directory.ChangeResource(dbcon, transaction, id, null, changes);

					changes[id] = new ResourceChange {
						Before = before,
						After = after
					};

					transaction.Commit();
				}
			}
			// notify the changes
			foreach(string resourceId in changes.Keys) {
				Directory.NotifyChange(changes[resourceId].Before, changes[resourceId].After);
			}
		}

		public void GroupRemoveUser(string id, string user)
		{
			GroupRemoveUsers(id, user);
		}

		public void GroupAddUsers(string id, JsonValue data)
		{
			Dictionary<string,ResourceChange> changes = new Dictionary<string, ResourceChange>();

			lock(dbcon) {
				using(IDbTransaction transaction = dbcon.BeginTransaction()) {

					JsonValue before = GetResource(dbcon, transaction, id, null, 0);

					JsonArray users;
					if(data is JsonArray)
						users = (JsonArray)data;
					else {
						users = new JsonArray();
						users.Add(data);
					}
					foreach(string user in (JsonArray)data) {
						bool exists = false;
						// test if the user is not already in the group
						using(IDbCommand dbcmd = dbcon.CreateCommand()) {
							dbcmd.Transaction = transaction;
							dbcmd.CommandText = "SELECT COUNT(*) FROM ugroup_user WHERE ugroup=@ugroup AND user=@user";
							dbcmd.Parameters.Add(new SqliteParameter("ugroup", id));
							dbcmd.Parameters.Add(new SqliteParameter("user", user));
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
								dbcmd.Parameters.Add(new SqliteParameter("user", user));
								dbcmd.ExecuteNonQuery();
							}
						}
					}

					JsonValue after = Directory.ChangeResource(dbcon, transaction, id, null, changes);

					changes[id] = new ResourceChange {
						Before = before,
						After = after
					};

					transaction.Commit();
				}
			}
			// notify the changes
			foreach(string resourceId in changes.Keys) {
				Directory.NotifyChange(changes[resourceId].Before, changes[resourceId].After);
			}
		}

		public override async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// POST /[group]/users add a user in the group
			if((context.Request.Method == "POST") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "users")) {
				directory.EnsureRights(context, parts[0], false, true, false);

				GroupAddUsers(parts[0], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(directory.GetResource(parts[0], null, 0));
			}
			// DELETE /[group]/users/[user] remove a user from the group
			else if((context.Request.Method == "DELETE") && (parts.Length == 3) && IsValidId(parts[0]) && (parts[1] == "users") && IsValidId(parts[2])) {
				directory.EnsureRights(context, parts[0], false, true, false);

				GroupRemoveUser(parts[0], parts[2]);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			// DELETE /[group]/users remove some users from the group
			else if((context.Request.Method == "DELETE") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "users")) {
				directory.EnsureRights(context, parts[0], false, true, false);

				GroupRemoveUsers(parts[0], await context.Request.ReadAsJsonAsync());

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
			}
			else
				await base.ProcessRequestAsync(context);
		}
	}
}

