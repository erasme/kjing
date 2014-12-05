using System;
using System.Data;
using System.Collections;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;
using Erasme.Cloud.Utils;

namespace KJing.Directory
{
	public class ImageMediaInfoPlugin: IFilePlugin
	{
		static string[] supportedMimeTypes = new string[] {
			"image/png",
			"image/jpeg",
			"image/webp",
			"image/bmp",
			"image/gif",
			"image/x-icon",
			"image/x-portable-bitmap",
			"image/x-portable-greymap",
			"image/x-xpixmap",
			"image/x-portable-pixmap",
			"image/x-quicktime",
			"image/svg+xml",
			"image/tiff",
			"image/x-xbitmap",
			"image/xpm"
		};

		FileService fileService;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();

		public ImageMediaInfoPlugin(FileService fileService)
		{
			this.fileService = fileService;
		}

		public string Name {
			get {
				return "imageMediaInfo";
			}
		}

		public string[] MimeTypes {
			get {
				return supportedMimeTypes;
			}
		}

		public void Init(IDbConnection dbcon)
		{
			// create the imageMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE imageMediaInfo (id VARCHAR PRIMARY KEY, fails INTEGER(1), width INTEGER, height INTEGER)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
		}

		public void ProcessContent(JsonValue data, string contentFilePath)
		{
			if(contentFilePath == null)
				return;

			int width = 0;
			int height = 0;
			bool fails = true;
			// if imageMediaInfo not found, try to build it
			double doubleWidth;
			double doubleHeight;
			Erasme.Cloud.Preview.ImageVideoPreview.GetImageSize(contentFilePath, out doubleWidth, out doubleHeight);
			if((doubleWidth != 0) || (doubleHeight != 0)) {
				width = (int)doubleWidth;
				height = (int)doubleHeight;
				fails = false;
			}
			else
				fails = true;

			JsonValue imageMediaInfo = new JsonObject();
			data["imageMediaInfo"] = imageMediaInfo;
			imageMediaInfo["width"] = width;
			imageMediaInfo["height"] = height;
			imageMediaInfo["fails"] = fails;
		}

		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceRights> parents)
		{
			// contentRev == 0 => no file content
			if(value.ContainsKey("contentRev") && ((long)value["contentRev"] == 0))
				return;

			bool found = false;
			bool fails = false;
			int width = 0;
			int height = 0;

			// select from the imageMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT fails,width,height FROM imageMediaInfo WHERE id=@id";
				dbcmd.Transaction = transaction;
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(reader.Read()) {
						found = true;
						if(!reader.IsDBNull(0))
							fails = reader.GetBoolean(0);
						if(!reader.IsDBNull(1))
							width = reader.GetInt32(1);
						if(!reader.IsDBNull(2))
							height = reader.GetInt32(2);
					}
					reader.Close();
				}
			}

			// if imageMediaInfo not found, try to build it now
			if(!found) {
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id)) {
						LongTask task = new LongTask(delegate {
							try {
								JsonValue diff = new JsonObject();
								ProcessContent(diff, fileService.GetLocalFile(id));
								fileService.Directory.ChangeResource(id, diff);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id);
								}
							}
						}, null, "Get imageMediaInfo for "+id, LongTaskPriority.High);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id] = task;
					}
				}
			}

			if(found && !fails) {
				JsonObject imageMediaInfo = new JsonObject();
				imageMediaInfo["width"] = width;
				imageMediaInfo["height"] = height;
				value["imageMediaInfo"] = imageMediaInfo;
			}
		}

		public void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
			Change(dbcon, transaction, data["id"], null, data);
		}

		public void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff)
		{
			bool found = false;
			bool fails = false;
			int width = 0;
			int height = 0;

			if(!diff.ContainsKey("imageMediaInfo"))
				return;

			// select from the imageMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT fails,width,height FROM imageMediaInfo WHERE id=@id";
				dbcmd.Transaction = transaction;
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(reader.Read()) {
						found = true;
						if(!reader.IsDBNull(0))
							fails = reader.GetBoolean(0);
						if(!reader.IsDBNull(1))
							width = reader.GetInt32(1);
						if(!reader.IsDBNull(2))
							height = reader.GetInt32(2);
					}
					reader.Close();
				}
			}

			JsonValue imageMediaInfo = diff["imageMediaInfo"];
			if(imageMediaInfo.ContainsKey("width"))
				width = imageMediaInfo["width"];
			if(imageMediaInfo.ContainsKey("height"))
				height = imageMediaInfo["height"];
			if(imageMediaInfo.ContainsKey("fails"))
				fails = imageMediaInfo["fails"];


			// if imageMediaInfo not found, insert it
			if(!found) {
				// cache the result in the database
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "INSERT INTO imageMediaInfo (id,fails,width,height) VALUES (@id,@fails,@width,@height)";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("fails", fails));
					dbcmd.Parameters.Add(new SqliteParameter("width", width));
					dbcmd.Parameters.Add(new SqliteParameter("height", height));
					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("imageMediaInfo create fails");
				}
			}
			// else update it
			else {
				// cache the result in the database
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE imageMediaInfo fails=@fails,width=@width,height=@height WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("fails", fails));
					dbcmd.Parameters.Add(new SqliteParameter("width", width));
					dbcmd.Parameters.Add(new SqliteParameter("height", height));
					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("imageMediaInfo update fails");
				}
			}
		}

		public void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data)
		{
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM imageMediaInfo WHERE id=@id";
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				dbcmd.ExecuteNonQuery();
			}
		}

		public Task ProcessRequestAsync(HttpContext context)
		{
			return Task.FromResult<Object>(null);
		}
	}
}

