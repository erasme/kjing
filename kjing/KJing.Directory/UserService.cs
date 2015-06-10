// UserService.cs
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
		long defaultUserBytesQuota;

		public UserService(DirectoryService directory, long defaultUserBytesQuota): base(directory)
		{
			this.directory = directory;
			this.defaultUserBytesQuota = defaultUserBytesQuota;
			this.dbcon = directory.DbCon;
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
					"admin INTEGER(1) DEFAULT 0, "+
					"login VARCHAR DEFAULT NULL, password VARCHAR DEFAULT NULL, "+
					"googleid VARCHAR DEFAULT NULL,"+
					"facebookid VARCHAR DEFAULT NULL,"+
					"data VARCHAR DEFAULT NULL, quotaBytesMax INTEGER DEFAULT NULL)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
		}

		public override void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, List<string> groups, Rights heritedRights, List<ResourceContext> parents, ResourceContext context)
		{
			// get the face image
			JsonValue faceJson = directory.GetChildResourceByName(dbcon, transaction, id, "face", filterBy, groups, heritedRights, parents, context, true);
			if(faceJson != null)
				value["face"] = faceJson;

			// select from the user table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT firstname,lastname,login,email,googleid,facebookid,description,quotaBytesMax,admin,data FROM user WHERE id=@id";
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
					if(reader.IsDBNull(7))
						value["quotaBytesMax"] = null;
					else
						value["quotaBytesMax"] = reader.GetInt64(7);
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
						value["admin"] = reader.GetBoolean(8);
						if(reader.IsDBNull(9))
							value["data"] = null;
						else
							value["data"] = JsonValue.Parse(reader.GetString(9));
					}
				}
			}

			value["shares"] = directory.GetShares(dbcon, transaction, id);
			//value["shares"] = directory.GetSharesByWith(dbcon, transaction, id, null);

//			List<string> userGroups = new List<string>();
//			directory.GetUserGroups(dbcon, transaction, id, userGroups);
//			JsonArray groupsJson = new JsonArray();
//			value["groups"] = groupsJson;
//			foreach(string groupId in userGroups)
//				groupsJson.Add(groupId);


			if((filterBy != null) && (filterBy != id)) {
				// select resources shared by this user
//				JsonArray shares = new JsonArray();
//				value["shares"] = shares;
//				JsonArray allShares = directory.GetUserShares(dbcon, transaction, filterBy, groups);
//				foreach(JsonValue share in allShares) {
//					if(share["owner"] == id)
//						shares.Add(share);
//				}
				// TODO: need to handle groups also
				//value["shares"] = directory.GetSharesByWith(dbcon, transaction, id, filterBy);

				value["sharesBy"] = directory.GetSharesByWith(dbcon, transaction, id, filterBy);
				value["sharesWith"] = directory.GetSharesByWith(dbcon, transaction, filterBy, id);

//				List<string> userGroups = new List<string>();
//				directory.GetUserGroups(dbcon, transaction, id, userGroups);
//				value["shares"] = directory.GetUserShares(dbcon, transaction, id, userGroups);

				// get the resources this user share with filterBy
//				value["ownShares"] = directory.GetSharesByWith(dbcon, transaction, id, filterBy);
			}
			else {
				// get all resources shared with the given user
//				List<string> userGroups = new List<string>();
//				directory.GetUserGroups(dbcon, transaction, id, userGroups);
//				value["shares"] = directory.GetUserShares(dbcon, transaction, id, userGroups);

				// get all the resources this user share
//				value["ownShares"] = directory.GetSharesByWith(dbcon, transaction, id, null);

				// get the groups this user is in
//				JsonArray jsonGroups = new JsonArray();
//				value["groups"] = jsonGroups;
//				foreach(string g in groups) {
//					jsonGroups.Add(g);
//				}
			}
		}

		public override void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
			string user = (string)data["id"];

			// Only allow users to be root resources (at least for now)
			if(data.ContainsKey("parent") && ((string)data["parent"] != null))
				throw new WebException(400, 0, "User are root resources. Parent is not allowed");

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
				dbcmd.CommandText = "INSERT INTO user (id,"+sbKeys.ToString()+",quotaBytesMax) VALUES (@id,"+sbValues.ToString()+",@quotaBytesMax)";
				dbcmd.Parameters.Add(new SqliteParameter("id", user));
				if(defaultUserBytesQuota < 0)
					dbcmd.Parameters.Add(new SqliteParameter("quotaBytesMax", null));
				else
					dbcmd.Parameters.Add(new SqliteParameter("quotaBytesMax", defaultUserBytesQuota));

				if(dbcmd.ExecuteNonQuery() != 1)
					throw new Exception("User create fails");
			}

			// if first created user, set the admin flags, set quota to infinite
			bool firstUser = false;
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "SELECT COUNT(id) FROM user";
				firstUser = (Convert.ToInt32(dbcmd.ExecuteScalar()) == 1);
			}
			if(firstUser) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE user SET admin=1, quotaBytesMax=NULL WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", user));
					dbcmd.ExecuteNonQuery();
				}
			}

			// update the name build with firstname and lastname
			if((data.ContainsKey("firstname") || data.ContainsKey("lastname")) && !data.ContainsKey("name")) {
				string name = "";
				if(data.ContainsKey("firstname") && (data["firstname"] != null))
					name += data["firstname"]+" ";
				if(data.ContainsKey("lastname") && (data["lastname"] != null))
					name += data["lastname"];
				data["name"] = name;
			}
			// index the description if any
			if(data.ContainsKey("description")) {
				data["indexingContent"] = data["description"];
			}

		}

		public override void Change(IDbConnection dbcon, IDbTransaction transaction, string user, JsonValue data, JsonValue diff, Dictionary<string, ResourceChange> changes)
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

			// test if the user is over quota
			if(diff.ContainsKey("quotaBytesUsed") && (data["quotaBytesMax"] != null) &&
			   ((long)diff["quotaBytesUsed"] > (long)data["quotaBytesMax"]))
				throw new WebException(403, 3, "User is over quota");

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
				// handle quotaBytesMax
				if(diff.ContainsKey("quotaBytesMax")) {
					if(first)
						first = false;
					else
						sb.Append(",");
					sb.Append("quotaBytesMax=@quotaBytesMax");
					if((diff["quotaBytesMax"] == null) || ((long)diff["quotaBytesMax"] < 0))
						dbcmd.Parameters.Add(new SqliteParameter("quotaBytesMax", null));
					else
						dbcmd.Parameters.Add(new SqliteParameter("quotaBytesMax", (long)diff["quotaBytesMax"]));
				}
				// handle booleans
				if(diff.ContainsKey("admin")) {
					if(first)
						first = false;
					else
						sb.Append(",");
					sb.Append("admin=@admin");
					dbcmd.Parameters.Add(new SqliteParameter("admin", (bool)diff["admin"] ? 1 : 0));
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
				// update the name build with firstname and lastname
				if((diff.ContainsKey("firstname") || diff.ContainsKey("lastname")) && !diff.ContainsKey("name")) {
					string name = "";
					if(diff.ContainsKey("firstname") && (diff["firstname"] != null))
						name += diff["firstname"]+" ";
					else if(data.ContainsKey("firstname") && (data["firstname"] != null))
						name += data["firstname"]+" ";

					if(diff.ContainsKey("lastname") && (diff["lastname"] != null))
						name += diff["lastname"];
					else if(data.ContainsKey("lastname") && (data["lastname"] != null))
						name += data["lastname"];
					diff["name"] = name;
				}
				// index the description if any
				if(diff.ContainsKey("description")) {
					diff["indexingContent"] = diff["description"];
				}
			}
		}

		public override void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, Dictionary<string, ResourceChange> changes)
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

			// POST /login
			if((context.Request.Method == "POST") && (parts.Length == 1) && (parts[0] == "login")) {
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

				FileDefinition fileDefinition = await directory.GetFileDefinitionAsync(context);

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
			else
				await base.ProcessRequestAsync(context);
		}
	}
}

