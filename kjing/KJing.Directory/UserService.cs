﻿// UserService.cs
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
using System.Data;
using System.Diagnostics;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;
using Erasme.Cloud.Logger;

namespace KJing.Directory
{
	public class UserService: ResourceService
	{
		DirectoryService directory;
		IDbConnection dbcon;
		ILogger logger;

		public UserService(DirectoryService directory): base(directory)
		{
			this.directory = directory;
			this.dbcon = directory.DbCon;
			this.logger = directory.Logger;
		}

		public override string Name {
			get {
				return "user";
			}
		}

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

		public override void Init(IDbConnection dbcon)
		{
			// create user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE user (id VARCHAR PRIMARY KEY,"+
					"firstname VARCHAR DEFAULT NULL, lastname VARCHAR DEFAULT NULL,"+
					"email VARCHAR DEFAULT NULL, description VARCHAR DEFAULT NULL,"+
					"quota INTEGER DEFAULT 0, used INTEGER DEFAULT 0,"+
					"admin INTEGER(1) DEFAULT 0, "+
					"login VARCHAR DEFAULT NULL, password VARCHAR DEFAULT NULL, "+
					"googleid VARCHAR DEFAULT NULL,"+
					"facebookid VARCHAR DEFAULT NULL,"+
					"data VARCHAR DEFAULT NULL)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
		}

		public override void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceRights> parents)
		{
			// get the face image
			JsonValue faceJson = directory.GetChildResourceByName(dbcon, transaction, id, "face", filterBy, 0, groups, heritedRights, parents, true);
			if(faceJson != null)
				value["face"] = faceJson;

			// select from the user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT firstname,lastname,login,email,googleid,facebookid,description,quota,used,admin,data FROM user WHERE id=@id";
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
					if(reader.IsDBNull(6))
						value["description"] = null;
					else
						value["description"] = reader.GetString(6);
					// only visible by admins (or myself)
					if(heritedRights.Admin) {
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
						value["quota"] = reader.GetInt64(7);
						value["used"] = reader.GetInt64(8);
						value["admin"] = reader.GetBoolean(9);
						if(reader.IsDBNull(10))
							value["data"] = null;
						else
							value["data"] = JsonValue.Parse(reader.GetString(10));
					}
				}
			}

			if((filterBy != null) && (filterBy != id) && (depth > 0)) {
				// select resources shared by this user
				JsonArray shares = new JsonArray();
				value["shares"] = shares;

				JsonArray allShares = directory.GetUserShares(dbcon, transaction, filterBy, depth, groups);
				foreach(JsonValue share in allShares) {
					if(share["owner"] == id)
						shares.Add(share);
				}

				// get the groups this user is in
				JsonArray jsonGroups = new JsonArray();
				value["groups"] = jsonGroups;

				foreach(string g in groups) {
					try {
						jsonGroups.Add(directory.GetResource(dbcon, transaction, g, filterBy, depth-1));
					}
					catch(WebException e) {
						logger.Log(LogLevel.Error, "Group '" + g + "' not found while getting user '" + id + "' (" + e.ToString() + ")");
					}
				}
			}
		}

		public override void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
			string user = (string)data["id"];

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

			// check if the login is already used
			if(data.ContainsKey("login") && (data["login"] != null)) {
				string login = (string)data["login"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE login=@login";
					dbcmd.Parameters.Add(new SqliteParameter("login", login));
					if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
						throw new WebException(409, 2, "login already used, choose another one");
				}
			}

			// check if the googleid is already used
			if(data.ContainsKey("googleid") && (data["googleid"] != null)) {
				string googleid = (string)data["googleid"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE googleid=@googleid";
					dbcmd.Parameters.Add(new SqliteParameter("googleid", googleid));
					if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
						throw new WebException(409, 3, "googleid already used");
				}
			}

			// check if the facebookid is already used
			if(data.ContainsKey("facebookid") && (data["facebookid"] != null)) {
				string facebookid = (string)data["facebookid"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE facebookid=@facebookid";
					dbcmd.Parameters.Add(new SqliteParameter("facebookid", facebookid));
					if(Convert.ToInt32(dbcmd.ExecuteScalar()) >= 1)
						throw new WebException(409, 3, "facebookid already used");
				}
			}

			// insert into user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				bool first = true;
				StringBuilder sbKeys = new StringBuilder();
				StringBuilder sbValues = new StringBuilder();
				// handle strings
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
						sbValues.Append("@");
						sbValues.Append(key);
						dbcmd.Parameters.Add(new SqliteParameter(key, (string)data[key]));
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
						sbValues.Append("@");
						sbValues.Append(key);
						dbcmd.Parameters.Add(new SqliteParameter(key, (bool)data[key]));
					}
				}
				// handle JSON string
				if(data.ContainsKey("data") && (data["data"] != null)) {
					if(first)
						first = false;
					else {
						sbKeys.Append(",");
						sbValues.Append(",");
					}
					sbKeys.Append("data");
					sbValues.Append("@data");
					dbcmd.Parameters.Add(new SqliteParameter("data", ((JsonValue)data["data"]).ToString()));
				}

				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "INSERT INTO user (id,"+sbKeys.ToString()+") VALUES (@id,"+sbValues.ToString()+")";
				dbcmd.Parameters.Add(new SqliteParameter("id", user));

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

		public override void Change(IDbConnection dbcon, IDbTransaction transaction, string user, JsonValue data, JsonValue diff)
		{
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

			// check if the login is already used
			if(diff.ContainsKey("login") && (diff["login"] != null)) {
				string login = (string)diff["login"];
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "SELECT COUNT(id) FROM user WHERE login=@login AND id != @user";
					dbcmd.Parameters.Add(new SqliteParameter("login", login));
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
				bool first = true;
				StringBuilder sb = new StringBuilder();

				// handle strings
				foreach(string key in new string[]{ "firstname", "lastname", "description", "email", "login",
					"password", "googleid", "facebookid" }) {
					if(diff.ContainsKey(key)) {
						if(first)
							first = false;
						else
							sb.Append(",");
						sb.Append(key);
						sb.Append("=@");
						sb.Append(key);
						dbcmd.Parameters.Add(new SqliteParameter(key, (string)diff[key]));
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
						sb.Append("=@");
						sb.Append(key);
						dbcmd.Parameters.Add(new SqliteParameter(key, (long)diff[key]));
					}
				}
				// handle booleans
				if(diff.ContainsKey("admin")) {
					if(first)
						first = false;
					else
						sb.Append(",");
					sb.Append("admin=@admin");
					dbcmd.Parameters.Add(new SqliteParameter("admin", (long)diff["admin"]));
				}
				// handle JSON data
				if(diff.ContainsKey("data")) {
					if(first)
						first = false;
					else
						sb.Append(",");
					sb.Append("data=@data");
					if(diff["data"] == null)
						dbcmd.Parameters.Add(new SqliteParameter("data", null));
					else
						dbcmd.Parameters.Add(new SqliteParameter("data", ((JsonValue)diff["data"]).ToString()));
				}
				if(!first) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE user SET " + sb.ToString() + " WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", user));
					int count = dbcmd.ExecuteNonQuery();
					if(count != 1)
						throw new Exception("User update fails");
				}
			}
		}

		public override void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data)
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
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/convert", 
				file+" -auto-orient -strip -set option:distort:viewport "+
				"\"%[fx:min(w,h)]x%[fx:min(w,h)]+%[fx:max((w-h)/2,0)]+%[fx:max((h-w)/2,0)]\" "+
				"-distort SRT 0 +repage -resize 100x100 png:"+directory.BasePath+"/faces/"+user);
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

		void ConvertUserFace(JsonValue data, string tmpFile)
		{
			string destFile = Path.Combine(directory.TemporaryDirectory, Guid.NewGuid().ToString());
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/convert", 
				tmpFile+" -auto-orient -strip -set option:distort:viewport "+
				"\"%[fx:min(w,h)]x%[fx:min(w,h)]+%[fx:max((w-h)/2,0)]+%[fx:max((h-w)/2,0)]\" "+
				"-distort SRT 0 +repage -resize 100x100 png:"+destFile);
			Process process = new Process();
			process.StartInfo = startInfo;
			process.Start();
			process.WaitForExit();
			process.Dispose();
			if(File.Exists(destFile))
				File.Replace(destFile, tmpFile, null);
		}

		public void SetUserFaceFromUrl(string user, string url) 
		{
			string tmpFile = Path.Combine(directory.TemporaryDirectory, Guid.NewGuid().ToString());
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
								users.Add(directory.GetResource(dbcon, transaction, reader.GetString(0), seenBy, 0));
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

		public string GetUserFromLoginPassword(string login, string password)
		{
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
					string subPassword = foundPassword.Substring(pos+1);
					if(method == "clear")
						passwordGood = (password == subPassword);
					else if(method == "sha1") {
						System.Security.Cryptography.SHA1 hmac = System.Security.Cryptography.SHA1CryptoServiceProvider.Create();
						string sha1Password = Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes(password)));
						passwordGood = (sha1Password == subPassword);
					}
				}
			}
			if(passwordGood)
				return user;
			else
				return null;
		}

		public override async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// GET /[?firstname=firstname][&lastname=lastname][&description=description][&query=words] search
			if((context.Request.Method == "GET") && (parts.Length == 0)) {
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
			// POST /login
			else if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "login")) {
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
					JsonValue authSession = directory.AuthSessionService.Create(user);

					context.Response.StatusCode = 200;
					context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
					context.Response.Headers["set-cookie"] = directory.AuthCookie + "=" + (string)authSession["id"] + "; Path=/";
					authSession["header"] = directory.AuthHeader;
					context.Response.Content = new JsonContent(authSession);
				}
				else {
					context.Response.StatusCode = 403;
				}
			}
			// POST /[user]/face upload the user face
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "face") && IsValidId(parts[0])) {

				directory.EnsureRights(context, parts[0], false, true, false);

				FileDefinition fileDefinition = await directory.GetFilePostAsync(context);

				// check if it is really an image
				if(!((string)fileDefinition.Define["mimetype"]).StartsWith("image/"))
					throw new WebException(400, 0, "Invalid file. Expecting an image");
				// force the parent
				fileDefinition.Define["parent"] = parts[0];
				// force the file name
				fileDefinition.Define["name"] = "face";
				// the face name is MUST be unique. Only one face image can be set per user
				fileDefinition.Define["uniqueName"] = true;
				// the face is public readable
				fileDefinition.Define["publicRead"] = true;
				// the face is cached
				fileDefinition.Define["cache"] = true;
				// the converted face is always PNG
				fileDefinition.Define["mimetype"] = "image/png";
				// provide a ProcessContent to rotate, crop and convert the image
				fileDefinition.ProcessContent = ConvertUserFace;

				JsonValue jsonFile = await directory.CreateFileAsync(fileDefinition);

				JsonValue jsonDiff = new JsonObject();
				jsonDiff["face"] = jsonFile;
				// change the user because the face is embedded
				// and we want revision update, notifications...
				directory.ChangeResource(parts[0], jsonDiff);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(jsonFile);
			}
///////////////////
/*			// POST /[user]/face upload the user face
			else if((context.Request.Method == "POST") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "face")) {

				directory.EnsureRights(context, parts[0], false, true, false);

				string faceFile = null;
				if(context.Request.Headers["content-type"].StartsWith("multipart/form-data")) {
					MultipartReader reader = context.Request.ReadAsMultipart();
					MultipartPart part;
					while((part = reader.ReadPart()) != null) {
						// the file content
						if(part.Headers.ContentDisposition["name"] == "file") {
							faceFile = directory.TemporaryDirectory + "/" + Guid.NewGuid().ToString();
							using(FileStream fileStream = new FileStream(faceFile, FileMode.CreateNew, FileAccess.Write)) {
								part.Stream.CopyTo(fileStream);
							}
						}
					}
				}
				else {
					faceFile = directory.TemporaryDirectory + "/" + Guid.NewGuid().ToString();
					using(FileStream fileStream = new FileStream(faceFile, FileMode.CreateNew, FileAccess.Write)) {
						context.Request.InputStream.CopyTo(fileStream);
					}
				}
				if(faceFile != null)
					SetUserFace(parts[0], faceFile);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(directory.GetResource(parts[0], null, 0));
			}*/
			else
				await base.ProcessRequestAsync(context);
		}
	}
}
