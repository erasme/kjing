// DirectoryService.cs
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
using Erasme.Cloud.Utils;
using Erasme.Cloud.Message;

namespace KJing.Directory
{
	public partial class DirectoryService: IHttpHandler
	{
		IDbConnection dbcon;
		string authHeader;
		string authCookie;
		AuthSessionService authSessionService;
		string temporaryDirectory;
		int cacheDuration;
		ILogger logger;
		string basePath;
		PriorityTaskScheduler longRunningTaskScheduler;

		public Dictionary<string,IService> ResourceTypes = new Dictionary<string, IService>();
		UserService userService;
		ResourceService resourceService;
		FileService fileService;
		public MessageService MessageService { get; set; }

		public DirectoryService(
			string basepath, AuthSessionService authSessionService, string authHeader, string authCookie,
			long defaultUserBytesQuota, string temporaryDirectory, int cacheDuration, ILogger logger,
			PriorityTaskScheduler longRunningTaskScheduler)
		{
			this.basePath = basepath;
			this.authSessionService = authSessionService;
			this.authHeader = authHeader;
			this.authCookie = authCookie;
			this.temporaryDirectory = temporaryDirectory;
			this.cacheDuration = cacheDuration;
			this.logger = logger;
			this.longRunningTaskScheduler = longRunningTaskScheduler;

			if(!System.IO.Directory.Exists(basepath))
				System.IO.Directory.CreateDirectory(basepath);

			bool createNeeded = !File.Exists(basepath+"/directory.db");

			dbcon = (IDbConnection)new SqliteConnection("URI=file:"+basepath+"/directory.db");
			dbcon.Open();

			resourceService = new ResourceService(this);
			ResourceTypes[resourceService.Name] = resourceService;

			userService = new UserService(this, defaultUserBytesQuota);
			ResourceTypes[userService.Name] = userService;

			GroupService groupService = new GroupService(this);
			ResourceTypes[groupService.Name] = groupService;

			FolderService folderService = new FolderService(this);
			ResourceTypes[folderService.Name] = folderService;

			LinkService linkService = new LinkService(this);
			ResourceTypes[linkService.Name] = linkService;

			DeviceService deviceService = new DeviceService(this);
			ResourceTypes[deviceService.Name] = deviceService;

			MapService mapService = new MapService(this);
			ResourceTypes[mapService.Name] = mapService;

			fileService = new FileService(this);
			fileService.AddPlugin(new ImageMediaInfoPlugin(fileService));
			fileService.AddPlugin(new VideoMediaInfoPlugin(fileService));
			fileService.AddPlugin(new ThumbnailPlugin(fileService, "thumbnailLow", 64, 64));
			fileService.AddPlugin(new ThumbnailPlugin(fileService, "thumbnailHigh", 2048, 2048));
			fileService.AddPlugin(new AudioPlugin(fileService));
			fileService.AddPlugin(new VideoPlugin(fileService));
			fileService.AddPlugin(new PdfPlugin(fileService));
			fileService.AddPlugin(new PdfImagePlugin(fileService));
			fileService.AddPlugin(new KJing.FileIndexing.FileIndexingPlugin());
			ResourceTypes[fileService.Name] = fileService;

			if(createNeeded) {
				foreach(IService service in ResourceTypes.Values)
					service.Init(dbcon);
			}
			// disable disk sync
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "PRAGMA synchronous=0";
				dbcmd.ExecuteNonQuery();
			}
		}

		public string BasePath {
			get {
				return basePath;
			}
		}

		public string TemporaryDirectory {
			get {
				return temporaryDirectory;
			}
		}

		public int CacheDuration {
			get {
				return cacheDuration;
			}
		}

		public IDbConnection DbCon {
			get {
				return dbcon;
			}
		}

		public ILogger Logger {
			get {
				return logger;
			}
		}

		public AuthSessionService AuthSessionService {
			get {
				return authSessionService;
			}
		}

		public string AuthCookie {
			get {
				return authCookie;
			}
		}

		public string AuthHeader {
			get {
				return authHeader;
			}
		}

		public PriorityTaskScheduler LongRunningTaskScheduler {
			get {
				return longRunningTaskScheduler;
			}
		}

		public JsonArray GetUserShares(IDbConnection dbcon, IDbTransaction transaction, string user, int depth, List<string> groups)
		{
			return resourceService.GetUserShares(dbcon, transaction, user, depth, groups);
		}

		public JsonValue CreateResource(JsonValue data)
		{
			return resourceService.CreateResource(data);
		}

		public JsonValue CreateResource(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, Dictionary<string,ResourceChange> changes)
		{
			return resourceService.CreateResource(dbcon, transaction, data, changes);
		}

		public JsonValue GetResource(string id, string filterBy, int depth)
		{
			return resourceService.GetResource(id, filterBy, depth);
		}

		public JsonValue GetResource(IDbConnection dbcon, IDbTransaction transaction, string id, string filterBy, int depth)
		{
			return resourceService.GetResource(dbcon, transaction, id, filterBy, depth);
		}

		public JsonValue GetChildResourceByName(IDbConnection dbcon, IDbTransaction transaction, string parent, string name)
		{
			return GetChildResourceByName(dbcon, transaction, parent, name);
		}

		public JsonValue GetChildResourceByName(IDbConnection dbcon, IDbTransaction transaction, string parent, string name, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceContext> parents, bool cache)
		{
			return resourceService.GetChildResourceByName(dbcon, transaction, parent, name, filterBy, depth, groups, heritedRights, parents, cache);
		}

		public JsonValue ChangeResource(string id, JsonValue diff)
		{
			return resourceService.ChangeResource(id, diff);
		}

		public JsonValue ChangeResource(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue diff, Dictionary<string,ResourceChange> changes)
		{
			return resourceService.ChangeResource(dbcon, transaction, id, diff, changes);
		}

		public void DeleteResource(string id)
		{
			resourceService.DeleteResource(id);
		}

		public void DeleteResource(IDbConnection dbcon, IDbTransaction transaction, string id, Dictionary<string,ResourceChange> changes)
		{
			resourceService.DeleteResource(dbcon, transaction, id, changes);
		}

		public List<string> GetGroupUsers(string group)
		{
			return resourceService.GetGroupUsers(group);
		}

		public JsonArray GetUserShares(string user, int depth)
		{
			return resourceService.GetUserShares(user, depth);
		}

		public Task<FileDefinition> GetFilePostAsync(HttpContext context)
		{
			return fileService.GetFilePostAsync(context);
		}

		public Task<JsonValue> CreateFileAsync(FileDefinition fileDefinition)
		{
			return fileService.CreateFileAsync(fileDefinition);
		}

		public Task<JsonValue> CreateFileAsync(JsonValue data, Stream fileContentStream, ProcessContentHandler processContent)
		{
			return fileService.CreateFileAsync(data, fileContentStream, processContent);
		}

		public void NotifyChange(JsonValue oldValues, JsonValue newValues)
		{
			resourceService.NotifyChange(oldValues, newValues);

			// check for new sharing
			if((oldValues != null) && (newValues != null)) {
			
				// test if some rights have been added
				JsonArray oldRights = (JsonArray)oldValues["rights"];
				JsonArray newRights = (JsonArray)newValues["rights"];

				foreach(JsonValue right in newRights) {
					JsonValue oldRight = null;
					foreach(JsonValue r in oldRights) {
						if((string)r["user"] == (string)right["user"]) {
							oldRight = r;
							break;
						}
					}
					if(oldRight == null) {
						// find all concerned final users
						List<string> users = GetGroupUsers(right["user"]);
						foreach(string user in users)
							NotifyShare(newValues, user, right["user"]);
					}
				}

				// test if user added in a group
				if(newValues["type"] == "group") {
					foreach(string user in (JsonArray)newValues["users"]) {
						string oldUser = null;
						foreach(string u in (JsonArray)oldValues["users"]) {
							if(u == user) {
								oldUser = u;
								break;
							}
						}
						if(oldUser == null) {
							// find all concerned final users
							List<string> users = GetGroupUsers(user);
							// find all shared resources
							JsonArray shares = GetUserShares(user, 0);
							foreach(string u in users) {
								foreach(JsonValue resource in shares)
									NotifyShare(resource, u, user);
							}
						}
					}
				}

			}
		}

		void NotifyShare(JsonValue resource, string userId, string sharedBy)
		{
			// TODO
			Console.WriteLine("NotifyShare resource: " + resource["id"] + ", for user: " + userId);
			if(MessageService != null) {
				JsonValue message = new JsonObject();
				message["origin"] = resource["owner"];
				message["destination"] = userId;
				message["type"] = "resource";
				JsonValue content = new JsonObject();
				content["id"] = resource["id"];
				content["name"] = resource["name"];
				content["sharedBy"] = sharedBy;
				message["content"] = content;
				MessageService.SendMessage(message);
			}
		}

		////////////////////////////////////////////////////////////////////////////////
		// Handle authorizations
		////////////////////////////////////////////////////////////////////////////////

		public void EnsureIsAuthenticated(HttpContext context)
		{
			if(context.User == null) {
				string authenticatedUser = authSessionService.GetAuthenticatedUser(context);
				if(authenticatedUser == null) {
					// check for HTTP Basic authorization
					if(context.Request.Headers.ContainsKey("authorization")) {
						string[] parts = context.Request.Headers["authorization"].Split(new char[] { ' ' }, 2, StringSplitOptions.RemoveEmptyEntries);
						if(parts[0].ToLowerInvariant() == "basic") {
							string authorization = Encoding.UTF8.GetString(Convert.FromBase64String(parts[1]));
							int pos = authorization.IndexOf(':');
							if(pos != -1) {
								string login = authorization.Substring(0, pos);
								string password = authorization.Substring(pos + 1);
								authenticatedUser = userService.GetUserFromLoginPassword(login, password);
								context.User = authenticatedUser;
							}
						}
					}
					if(authenticatedUser == null)
						throw new WebException(401, 0, "Authentication needed");
				}
			}
		}

		public void EnsureIsAdmin(HttpContext context)
		{
			// need a logged user
			EnsureIsAuthenticated(context);

			JsonValue user = resourceService.GetResource(context.User, null, 0);
			if(!user.ContainsKey("admin") || !(bool)user["admin"])
				throw new WebException(403, 0, "Logged user has no sufficient credentials");
		}

		public void EnsureRights(HttpContext context, string resource, bool read, bool write, bool admin)
		{
			// need a logged user
			EnsureIsAuthenticated(context);

			Rights ownRight = resourceService.GetResourceOwnRights(resource, context.User);
			// user are the roots of the system. They are always "readable"
			if(resource.StartsWith("user:"))
				ownRight.Read = true;
			if(!((!read || ownRight.Read) && (!write || ownRight.Write) && (!admin || ownRight.Admin))) {
				// last chance, check if the connected user is not an admin
				JsonValue user = resourceService.GetResource(context.User, null, 0);
				if(!user.ContainsKey("admin") || !(bool)user["admin"])
					throw new WebException(403, 0, "Logged user has no sufficient credentials");
			}
		}

		public async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			if((parts.Length > 0) && ResourceTypes.ContainsKey(parts[0])) {
				context.Request.Path = context.Request.Path.Substring(parts[0].Length+1);
				await ResourceTypes[parts[0]].ProcessRequestAsync(context);
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

