// FileService.cs
// 
//  Directory to reference all resources of KJing
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2014-2015 Departement du Rhone - Metropole de Lyon
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
using System.Data;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;
using KJing.Storage;

namespace KJing.Directory
{
	public delegate void ProcessContentHandler(JsonValue data, string contentFilePath);

	public struct FileDefinition
	{
		public JsonValue Define;
		public Stream Stream;
		public ProcessContentHandler ProcessContent;
	}

	public class FileService: ResourceService
	{
		UploaderService uploaders = new UploaderService();
		KJing.Storage.Storage storage;
		Dictionary<string,List<IFilePlugin>> mimePlugins = new Dictionary<string,List<IFilePlugin>>();
		List<IFilePlugin> allPlugins = new List<IFilePlugin>();

		public FileService(DirectoryService directory): base(directory)
		{
			storage = new KJing.Storage.Storage(System.IO.Path.Combine(Directory.BasePath, "file"), Directory.TemporaryDirectory);
		}

		public override string Name {
			get {
				return "file";
			}
		}

		public override void Init(IDbConnection dbcon)
		{
			// create the file table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE file (id VARCHAR PRIMARY KEY, mimetype VARCHAR, size INTEGER DEFAULT 0, uploader VARCHAR DEFAULT NULL, contentRev INTEGER DEFAULT 0)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
			// init all plugins
			foreach(IFilePlugin plugin in allPlugins) {
				plugin.Init(dbcon);
			}
		}

		public Stream GetFileStream(string id)
		{
			return storage[TypeFreeId(id)];
		}

		public string GetLocalFile(string id)
		{
			return storage.GetLocalFile(TypeFreeId(id));
		}

		public JsonValue CreateFile(JsonValue data, string contentFilePath)
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

			JsonValue json = null;
			Dictionary<string,ResourceChange> changes = new Dictionary<string, ResourceChange>();

			// handle plugins
			if(mimePlugins.ContainsKey("*/*")) {
				foreach(IFilePlugin plugin in mimePlugins["*/*"])
					plugin.ProcessContent(data, data, contentFilePath);
			}
			if(data.ContainsKey("mimetype") && mimePlugins.ContainsKey(data["mimetype"])) {
				foreach(IFilePlugin plugin in mimePlugins[data["mimetype"]])
					plugin.ProcessContent(data, data, contentFilePath);
			}

			lock(Directory.DbCon) {
				using(IDbTransaction transaction = Directory.DbCon.BeginTransaction()) {
					if(uniqueName)
						removeResource = GetChildResourceByName(Directory.DbCon, transaction, parent, name, null, 0, null, new Rights(), null, cache);
					json = CreateFile(Directory.DbCon, transaction, data, contentFilePath, changes);
					if(removeResource != null)
						DeleteResource(Directory.DbCon, transaction, removeResource["id"], changes);
					transaction.Commit();
				}
			}
			// notify the changes
			foreach(string resourceId in changes.Keys) {
				Directory.NotifyChange(changes[resourceId].Before, changes[resourceId].After);
			}
			return json;
		}

		public JsonValue CreateFile(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, string contentFilePath, Dictionary<string,ResourceChange> changes)
		{
			long size = 0;
			if(contentFilePath != null) {
				size = (new FileInfo(contentFilePath)).Length;
				data["contentRev"] = 1;
			}
			else
				data["contentRev"] = 0;
			data["size"] = size;
			if(!data.ContainsKey("cache") || !(bool)data["cache"])
				data["quotaBytesUsed"] = size;
			data["uploader"] = null;
			JsonValue res = Directory.CreateResource(dbcon, transaction, data, changes);
			string id = res["id"];
			// store the file content
			if(contentFilePath != null)
				storage.Add(TypeFreeId(id), contentFilePath);

			return res;
		}

		public JsonValue CreateFile(JsonValue data, UploaderService.Uploader uploader)
		{
			JsonValue json = null;
			data["size"] = 0;
			data["uploader"] = uploader.Id;
			data["contentRev"] = 0;

			JsonValue removeResource = null;
			string parent = null;
			if(data.ContainsKey("parent"))
				parent = data["parent"];
			string name = null;
			if(data.ContainsKey("name"))
				name = data["name"];
			bool cache = false;
			if(data.ContainsKey("cache"))
				cache = data["cache"];
			bool uniqueName = data.ContainsKey("uniqueName") && (bool)data["uniqueName"];

			Dictionary<string,ResourceChange> changes = new Dictionary<string, ResourceChange>();

			lock(Directory.DbCon) {
				using(IDbTransaction transaction = Directory.DbCon.BeginTransaction()) {
					if(uniqueName)
						removeResource = GetChildResourceByName(Directory.DbCon, transaction, parent, name, cache);
					json = Directory.CreateResource(Directory.DbCon, transaction, data, changes);
					if(removeResource != null)
						DeleteResource(Directory.DbCon, transaction, removeResource["id"], changes);
					transaction.Commit();
				}
			}
			// notify the changes
			foreach(string resourceId in changes.Keys) {
				Directory.NotifyChange(changes[resourceId].Before, changes[resourceId].After);
			}

			return json;
		}

		public async Task<FileDefinition> GetFilePostAsync(HttpContext context)
		{
			string filename = null;
			string mimetype = null;
			long size = 0;
			JsonValue define = new JsonObject();
			string fileContentType = null;
			Stream fileContentStream = null;

			string contentType = context.Request.Headers["content-type"];
			if(contentType.IndexOf("multipart/form-data") >= 0) {
				MultipartReader reader = context.Request.ReadAsMultipart();
				MultipartPart part;
				while((part = await reader.ReadPartAsync()) != null) {
					// the JSON define part
					if(part.Headers.ContentDisposition["name"] == "define") {
						StreamReader streamReader = new StreamReader(part.Stream, Encoding.UTF8);
						string jsonString = await streamReader.ReadToEndAsync();
						define = JsonValue.Parse(jsonString);

						if(define.ContainsKey("name"))
							filename = (string)define["name"];
						if(define.ContainsKey("mimetype"))
							mimetype = (string)define["mimetype"];
					}
					// the file content
					else if(part.Headers.ContentDisposition["name"] == "file") {
						if((filename == null) && part.Headers.ContentDisposition.ContainsKey("filename"))
							filename = part.Headers.ContentDisposition["filename"];
						if(part.Headers.ContainsKey("content-type"))
							fileContentType = part.Headers["content-type"];

						fileContentStream = part.Stream;
						// file part MUST BE THE LAST ONE
						break;
					}
				}
			}
			else {
				define = await context.Request.ReadAsJsonAsync();
				if(define.ContainsKey("name"))
					filename = (string)define["name"];
				if(define.ContainsKey("mimetype"))
					mimetype = (string)define["mimetype"];
			}

			if(filename == null) {
				filename = "unknown";
				if(mimetype == null)
					mimetype = "application/octet-stream";
			}
			else if(mimetype == null) {
				// if mimetype was not given in the define part, decide it from
				// the file extension
				mimetype = FileContent.MimeType(filename);
				// if not found from the file extension, decide it from the Content-Type
				if((mimetype == "application/octet-stream") && (fileContentType != null))
					mimetype = fileContentType;
			}
			define["type"] = "file";
			define["mimetype"] = mimetype;
			define["size"] = size;
			define["name"] = filename;

			return new FileDefinition() { Define = define, Stream = fileContentStream };
		}

		public Task<JsonValue> CreateFileAsync(FileDefinition fileDefinition)
		{
			return CreateFileAsync(fileDefinition.Define, fileDefinition.Stream, fileDefinition.ProcessContent);
		}

		public async Task<JsonValue> CreateFileAsync(JsonValue data, Stream fileContentStream, ProcessContentHandler processContent)
		{
			JsonValue json = null;
			if(fileContentStream != null) {
				string uploaderId;
				if(data.ContainsKey("uploader"))
					uploaderId = data["uploader"];
				else
					uploaderId = Guid.NewGuid().ToString();
				using(UploaderService.Uploader uploader = uploaders.Create(uploaderId, fileContentStream)) {
					string fileId = CreateFile(data, uploader)["id"];
					string tmpFile = Path.Combine(Directory.TemporaryDirectory, Guid.NewGuid().ToString());
					try {
						await uploader.Run(tmpFile);
						if(processContent != null)
							processContent(data, tmpFile);
						json = ChangeFile(fileId, new JsonObject(), tmpFile);
					}
					catch(Exception) {
						try {
							Directory.DeleteResource(fileId);
						}
						finally {
							File.Delete(tmpFile);
						}
						throw;
					}
				}
			}
			else {
				json = CreateFile(data, (string)null);
			}
			return json;
		}

		public async Task<JsonValue> ChangeFileAsync(string id, JsonValue diff, Stream fileContentStream, ProcessContentHandler processContent)
		{
			JsonValue json = null;
			if(fileContentStream != null) {
				string uploaderId;
				if((diff != null) && diff.ContainsKey("uploader"))
					uploaderId = diff["uploader"];
				else
					uploaderId = Guid.NewGuid().ToString();
				using(UploaderService.Uploader uploader = uploaders.Create(uploaderId, fileContentStream)) {
					// TODO: change the file to attach the uploader
					string tmpFile = Path.Combine(Directory.TemporaryDirectory, Guid.NewGuid().ToString());
					try {
						await uploader.Run(tmpFile);
						if(processContent != null)
							processContent(diff, tmpFile);
						json = ChangeFile(id, new JsonObject(), tmpFile);
					}
					catch(Exception e) {
						try {
							Directory.DeleteResource(id);
						}
						finally {
							File.Delete(tmpFile);
						}
						throw new WebException(500, 0, "File upload fails", e);
					}
				}
			}
			else {
				json = ChangeFile(id, diff, (string)null);
			}
			return json;
		}
					
		public JsonValue ChangeFile(string id, JsonValue diff, string contentFilePath)
		{
			Console.WriteLine("FileService.ChangeFile id: "+id+", diff: "+diff);

			if(contentFilePath != null) {
				diff["size"] = (new FileInfo(contentFilePath)).Length;
				diff["uploader"] = null;

				Console.WriteLine("FileService.ChangeFile contains */*: " + mimePlugins.ContainsKey("*/*"));

				JsonValue data = Directory.GetResource(id, null, 0);
				// handle plugins
				if(mimePlugins.ContainsKey("*/*")) {
					foreach(IFilePlugin plugin in mimePlugins["*/*"])
						plugin.ProcessContent(data, diff, contentFilePath);
				}
				if(data.ContainsKey("mimetype") && mimePlugins.ContainsKey(data["mimetype"])) {
					foreach(IFilePlugin plugin in mimePlugins[data["mimetype"]])
						plugin.ProcessContent(data, diff, contentFilePath);
				}
			}
			else {
				diff["size"] = 0;
			}

			JsonValue jsonOld;
			JsonValue jsonNew;
			Dictionary<string,ResourceChange> changes = new Dictionary<string, ResourceChange>();

			lock(Directory.DbCon) {
				using(IDbTransaction transaction = Directory.DbCon.BeginTransaction()) {
					jsonOld = Directory.GetResource(Directory.DbCon, transaction, id, null, 0);
					jsonNew = ChangeFile(Directory.DbCon, transaction, id, jsonOld, diff, changes, contentFilePath);
					transaction.Commit();
				}
			}

			foreach(string resourceId in changes.Keys) {
				Directory.NotifyChange(changes[resourceId].Before, changes[resourceId].After);
			}

			return jsonNew;
		}

		public JsonValue ChangeFile(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff, Dictionary<string,ResourceChange> changes, string contentFilePath)
		{
			// if the file content is changed, update the content revision
			if(contentFilePath != null) {
				long contentRev = 1;
				if(data.ContainsKey("contentRev"))
					contentRev = (long)data["contentRev"];
				diff["contentRev"] = contentRev + 1;

				if(!data.ContainsKey("cache") || !(bool)data["cache"])
					diff["quotaBytesUsed"] = (long)diff["size"];
				else
					diff["quotaBytesUsed"] = 0;
			}
			// store the file content
			if(contentFilePath != null)
				storage.Replace(TypeFreeId(id), contentFilePath);
			JsonValue res;
			try {
				res = Directory.ChangeResource(dbcon, transaction, id, diff, changes);
			}
			catch(Exception) {
				if(contentFilePath != null)
					storage.Remove(TypeFreeId(id));
				throw;
			}
			return res;
		}

		public JsonValue ChangeFile(string id, JsonValue diff, UploaderService.Uploader uploader)
		{
			diff["uploader"] = uploader.Id;
			JsonValue res;
			Dictionary<string,ResourceChange> changes = new Dictionary<string, ResourceChange>();

			lock(Directory.DbCon) {
				using(IDbTransaction transaction = Directory.DbCon.BeginTransaction()) {
					res = Directory.ChangeResource(Directory.DbCon, transaction, id, diff, changes);
					transaction.Commit();
				}
			}

			foreach(string resourceId in changes.Keys) {
				Directory.NotifyChange(changes[resourceId].Before, changes[resourceId].After);
			}

			return res;
		}

		public override void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceContext> parents)
		{
			// select from the file table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT mimetype,size,uploader,contentRev FROM file WHERE id=@id";
				dbcmd.Transaction = transaction;
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(reader.Read()) {
						if(!reader.IsDBNull(0))
							value["mimetype"] = reader.GetString(0);
						if(!reader.IsDBNull(1))
							value["size"] = reader.GetInt64(1);
						if(!reader.IsDBNull(2))
							value["uploader"] = reader.GetString(2);
						if(!reader.IsDBNull(3))
							value["contentRev"] = reader.GetInt64(3);
					}
					reader.Close();
				}
			}
			// handle plugins
			if(mimePlugins.ContainsKey("*/*")) {
				foreach(IFilePlugin plugin in mimePlugins["*/*"])
					plugin.Get(dbcon, transaction, id, value, filterBy, depth, groups, heritedRights, parents);
			}
			if(value.ContainsKey("mimetype") && mimePlugins.ContainsKey(value["mimetype"])) {
				foreach(IFilePlugin plugin in mimePlugins[value["mimetype"]])
					plugin.Get(dbcon, transaction, id, value, filterBy, depth, groups, heritedRights, parents);
			}
		}

		public override void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
			string id = data["id"];
			string uploader = null;
			if(data.ContainsKey("uploader"))
				uploader = (string)data["uploader"];
			long contentRev = 0;
			if(data.ContainsKey("contentRev"))
				contentRev = (long)data["contentRev"];

			// insert into file table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "INSERT INTO file (id,mimetype,size,uploader,contentRev) VALUES (@id,@mimetype,@size,@uploader,@contentRev)";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.Parameters.Add(new SqliteParameter("mimetype", (string)data["mimetype"]));
				dbcmd.Parameters.Add(new SqliteParameter("size", (long)data["size"]));
				dbcmd.Parameters.Add(new SqliteParameter("uploader", uploader));
				dbcmd.Parameters.Add(new SqliteParameter("contentRev", contentRev));

				if(dbcmd.ExecuteNonQuery() != 1)
					throw new Exception("File create fails");
			}
			// handle plugins
			if(mimePlugins.ContainsKey("*/*")) {
				foreach(IFilePlugin plugin in mimePlugins["*/*"])
					plugin.Create(dbcon, transaction, data);
			}
			if(data.ContainsKey("mimetype") && mimePlugins.ContainsKey(data["mimetype"])) {
				foreach(IFilePlugin plugin in mimePlugins[data["mimetype"]])
					plugin.Create(dbcon, transaction, data);
			}
		}

		public override void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff)
		{
			// update the file table
			if(diff.ContainsKey("size")) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE file SET size=@size WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("size", (long)diff["size"]));

					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("File update fails");
				}
			}
			if(diff.ContainsKey("uploader")) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE file SET uploader=@uploader WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("uploader", (string)diff["uploader"]));

					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("File update fails");
				}
			}
			if(diff.ContainsKey("contentRev")) {
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE file SET contentRev=@contentRev WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("contentRev", (long)diff["contentRev"]));

					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("File update fails");
				}
			}

			// handle plugins
			if(mimePlugins.ContainsKey("*/*")) {
				foreach(IFilePlugin plugin in mimePlugins["*/*"])
					plugin.Change(dbcon, transaction, id, data, diff);
			}
			if(data.ContainsKey("mimetype") && mimePlugins.ContainsKey(data["mimetype"])) {
				foreach(IFilePlugin plugin in mimePlugins[data["mimetype"]])
					plugin.Change(dbcon, transaction, id, data, diff);
			}
		}

		public override void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data)
		{
			// handle plugins
			if(mimePlugins.ContainsKey("*/*")) {
				foreach(IFilePlugin plugin in mimePlugins["*/*"])
					plugin.Delete(dbcon, transaction, id, data);
			}
			if(data.ContainsKey("mimetype") && mimePlugins.ContainsKey(data["mimetype"])) {
				foreach(IFilePlugin plugin in mimePlugins[data["mimetype"]])
					plugin.Delete(dbcon, transaction, id, data);
			}
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM file WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
			storage.Remove(TypeFreeId(id));
		}

		public void AddPlugin(IFilePlugin plugin)
		{
			foreach(string mimetype in plugin.MimeTypes) {
				List<IFilePlugin> plugins;
				if(mimePlugins.ContainsKey(mimetype))
					plugins = mimePlugins[mimetype];
				else {
					plugins = new List<IFilePlugin>();
					mimePlugins[mimetype] = plugins;
				}
				plugins.Add(plugin);
			}
			allPlugins.Add(plugin);
		}

		public override async Task ProcessRequestAsync(HttpContext context)
		{
			string[] parts = context.Request.Path.Split(new char[] { '/' }, System.StringSplitOptions.RemoveEmptyEntries);

			// POST / create a file
			if((context.Request.Method == "POST") && (parts.Length == 0)) {
			
				FileDefinition fileDefinition = await GetFilePostAsync(context);

				// check that the definition is correct
				if(!fileDefinition.Define.ContainsKey("type") || ((string)fileDefinition.Define["type"] != "file"))
					throw new WebException(400, 0, "Resource \"type\" is needed to create a new resource");
				if(!fileDefinition.Define.ContainsKey("parent"))
					throw new WebException(400, 0, "Resource that are not users need a parent resource");
				if((fileDefinition.Stream != null) && (fileDefinition.Define == null))
					throw new WebException(400, 0, "File resource POST request MUST provide a \"define\" part first and the \"file\" part last");
					
				// check rights on the parent
				Directory.EnsureRights(context, (string)fileDefinition.Define["parent"], false, true, false);

//				long file;
//				if(define.ContainsKey("downloadUrl") && (tmpFile == null)) {
//					string downloadUrl = define["downloadUrl"];
//					((JsonObject)define).Remove("downloadUrl");
//					file = CreateFileFromUrl(storage, parent, filename, mimetype, downloadUrl, define, true);
//				}
//				else {
//					file = CreateFile(storage, parent, filename, mimetype, tmpFile, define, true);
//				}

				JsonValue jsonFile = await CreateFileAsync(fileDefinition);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(jsonFile);
			}
			// POST /[file]/copy create a copy of a given file
			else if((context.Request.Method == "POST") && (parts.Length == 2) && (parts[1] == "copy") && IsValidId(parts[0])) {

				FileDefinition fileDefinition = await GetFilePostAsync(context);

				// check that the definition is correct
				if(fileDefinition.Define.ContainsKey("type") && ((string)fileDefinition.Define["type"] != "file"))
					throw new WebException(400, 0, "A file copy is of type \"file\"");
				fileDefinition.Define["type"] = "file";
				if(!fileDefinition.Define.ContainsKey("parent"))
					throw new WebException(400, 0, "Resource that are not users need a parent resource");
				if(fileDefinition.Stream != null)
					throw new WebException(400, 0, "A file copy can\'t provide a file stream");

				// check rights on the parent
				Directory.EnsureRights(context, (string)fileDefinition.Define["parent"], false, true, false);
				// check rights for the source of the copy
				Directory.EnsureRights(context, parts[0], true, false, false);

				// fill the file missing parts for the source file
				JsonValue sourceResource = Directory.GetResource(parts[0], null, 0);
				fileDefinition.Define["mimetype"] = (string)sourceResource["mimetype"];
				if(!fileDefinition.Define.ContainsKey("name") || ((string)fileDefinition.Define["name"] == "unknown"))
					fileDefinition.Define["name"] = (string)sourceResource["name"];
				fileDefinition.Stream = storage.Get(TypeFreeId(parts[0]));

				JsonValue jsonFile = await CreateFileAsync(fileDefinition);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(jsonFile);
			}
			// GET /[file]/content get file content
			else if((context.Request.Method == "GET") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "content")) {
				string file = parts[0];

				Directory.EnsureRights(context, file, true, false, false);
				JsonValue json = Directory.GetResource(file, null, 0);

				context.Response.StatusCode = 200;
				context.Response.Headers["content-type"] = json["mimetype"];
				if(context.Request.QueryString.ContainsKey("attachment")) {
					string fileName = (string)json["name"];
					fileName = fileName.Replace('"', ' ');
					context.Response.Headers["content-disposition"] = "attachment; filename=\"" + fileName + "\"";
				}
				if(!context.Request.QueryString.ContainsKey("nocache"))
					context.Response.Headers["cache-control"] = "max-age=" + Directory.CacheDuration;
				context.Response.SupportRanges = true;
				context.Response.Content = new StreamContent(storage[TypeFreeId(file)]);

//					new FileContent(basePath + "/" + storage + "/" + file);


/*
				string filename ;
				string mimetype;
				long rev;
				GetDownloadFileInfo(storage, file, out mimetype, out filename, out rev);

				long argRev = -1;
				if(context.Request.QueryString.ContainsKey("rev"))
					argRev = Convert.ToInt64(context.Request.QueryString["rev"]);

				// redirect to the URL with the correct rev
				if(argRev != rev) {
					context.Response.StatusCode = 307;
					context.Response.Headers["location"] = "content?rev=" + rev;
				}
				else {
					if(context.Request.QueryString.ContainsKey("attachment"))
						context.Response.Headers["content-disposition"] = "attachment; filename=\"" + filename + "\"";
					context.Response.Headers["content-type"] = mimetype;

					context.Response.StatusCode = 200;
					if(!context.Request.QueryString.ContainsKey("nocache"))
						context.Response.Headers["cache-control"] = "max-age=" + cacheDuration;
					context.Response.SupportRanges = true;
					context.Response.Content = new FileContent(basePath + "/" + storage + "/" + file);
				}*/
			}
			// PUT /[file]/content upload a new file content
			else if((context.Request.Method == "PUT") && (parts.Length == 2) && IsValidId(parts[0]) && (parts[1] == "content")) {
				// TODO
				JsonValue jsonFile = await ChangeFileAsync(parts[0], null, context.Request.InputStream, null);

				context.Response.StatusCode = 200;
				context.Response.Headers["cache-control"] = "no-cache, must-revalidate";
				context.Response.Content = new JsonContent(jsonFile);
			}
			else
				await base.ProcessRequestAsync(context);
		}
	}
}

