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
	public class VideoMediaInfoPlugin: IFilePlugin
	{
		static string[] supportedMimeTypes = new string[] {
			"video/x-ms-asf",
			"video/avi",
			"video/x-dv",
			"video/mpeg",
			"video/mp4",
			"video/x-motion-jpeg",
			"video/quicktime",
			"video/vnd.rn-realvideo",
			"video/webm"
		};

		FileService fileService;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();

		public VideoMediaInfoPlugin(FileService fileService)
		{
			this.fileService = fileService;
		}

		public string Name {
			get {
				return "videoMediaInfo";
			}
		}

		public string[] MimeTypes {
			get {
				return supportedMimeTypes;
			}
		}

		public void Init(IDbConnection dbcon)
		{
			// create the videoMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE videoMediaInfo (id VARCHAR PRIMARY KEY, fails INTEGER(1), "+
					"width INTEGER, height INTEGER, durationMilliseconds INTEGER)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
		}

		public void ProcessContent(JsonValue data, JsonValue diff, string contentFilePath)
		{
			if(contentFilePath == null)
				return;

			int width = 0;
			int height = 0;
			long durationMilliseconds = 0;
			bool fails = true;

			double doubleWidth;
			double doubleHeight;
			Erasme.Cloud.Preview.ImageVideoPreview.GetVideoSize(contentFilePath, out doubleWidth, out doubleHeight);
			if((doubleWidth != 0) || (doubleHeight != 0)) {
				width = (int)doubleWidth;
				height = (int)doubleHeight;

				double doubleDuration = Erasme.Cloud.Preview.ImageVideoPreview.GetVideoDuration(contentFilePath);
				if(doubleDuration != 0) {
					durationMilliseconds = (long)(doubleDuration * 1000);
					fails = false;
				}
			}

			JsonValue videoMediaInfo = new JsonObject();
			if(diff != null)
				diff["videoMediaInfo"] = videoMediaInfo;
			else
				data["videoMediaInfo"] = videoMediaInfo;
			videoMediaInfo["width"] = width;
			videoMediaInfo["height"] = height;
			videoMediaInfo["durationMilliseconds"] = durationMilliseconds;
			videoMediaInfo["fails"] = fails;
		}

		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, List<string> groups, Rights heritedRights, List<ResourceContext> parents, ResourceContext context)
		{
			// contentRev == 0 => no file content
			if(value.ContainsKey("contentRev") && ((long)value["contentRev"] == 0))
				return;

			bool found = false;
			bool fails = true;
			int width = 0;
			int height = 0;
			long durationMilliseconds = 0;

			// select from the videoMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT fails,width,height,durationMilliseconds FROM videoMediaInfo WHERE id=@id";
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
						if(!reader.IsDBNull(3))
							durationMilliseconds = reader.GetInt64(3);
					}
					reader.Close();
				}
			}

			// if videoMediaInfo not found, try to build it now
			if(!found) {
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id)) {
						LongTask task = new LongTask(delegate {
							try {
								JsonValue diff = new JsonObject();
								ProcessContent(value, diff, fileService.GetLocalFile(id));
								fileService.Directory.ChangeResource(id, diff);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id);
								}
							}
						}, null, "Get videoMediaInfo for "+id, LongTaskPriority.High);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id] = task;
					}
				}
			}

			if(found && !fails) {
				JsonObject videoMediaInfo = new JsonObject();
				videoMediaInfo["width"] = width;
				videoMediaInfo["height"] = height;
				videoMediaInfo["durationMilliseconds"] = durationMilliseconds;
				value["videoMediaInfo"] = videoMediaInfo;
			}
		}

		public void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
			Change(dbcon, transaction, data["id"], null, data, changes);
		}

		public void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff, Dictionary<string, ResourceChange> changes)
		{
			bool found = false;
			bool fails = false;
			int width = 0;
			int height = 0;
			long durationMilliseconds = 0;

			if(!diff.ContainsKey("videoMediaInfo"))
				return;

			// select from the videoMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT fails,width,height,durationMilliseconds FROM videoMediaInfo WHERE id=@id";
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
						if(!reader.IsDBNull(3))
							durationMilliseconds = reader.GetInt64(3);
					}
					reader.Close();
				}
			}

			JsonValue videoMediaInfo = diff["videoMediaInfo"];
			if(videoMediaInfo.ContainsKey("width"))
				width = videoMediaInfo["width"];
			if(videoMediaInfo.ContainsKey("height"))
				height = videoMediaInfo["height"];
			if(videoMediaInfo.ContainsKey("fails"))
				fails = videoMediaInfo["fails"];
			if(videoMediaInfo.ContainsKey("durationMilliseconds"))
				durationMilliseconds = videoMediaInfo["durationMilliseconds"];

			// if videoMediaInfo not found, insert it
			if(!found) {
				// cache the result in the database
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "INSERT INTO videoMediaInfo (id,fails,width,height,durationMilliseconds) VALUES (@id,@fails,@width,@height,@durationMilliseconds)";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("fails", fails));
					dbcmd.Parameters.Add(new SqliteParameter("width", width));
					dbcmd.Parameters.Add(new SqliteParameter("height", height));
					dbcmd.Parameters.Add(new SqliteParameter("durationMilliseconds", durationMilliseconds));
					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("videoMediaInfo create fails");
				}
			}
			// else update it
			else {
				// cache the result in the database
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE durationMilliseconds fails=@fails,width=@width,height=@height,durationMilliseconds=@durationMilliseconds WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("fails", fails));
					dbcmd.Parameters.Add(new SqliteParameter("width", width));
					dbcmd.Parameters.Add(new SqliteParameter("height", height));
					dbcmd.Parameters.Add(new SqliteParameter("durationMilliseconds", durationMilliseconds));
					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("videoMediaInfo update fails");
				}
			}

		}

		public void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM videoMediaInfo WHERE id=@id";
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

