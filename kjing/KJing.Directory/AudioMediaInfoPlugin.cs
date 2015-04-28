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
	public class AudioMediaInfoPlugin: IFilePlugin
	{
		static string[] supportedMimeTypes = new string[] {
			"audio/aac",
			"audio/aiff",
			"audio/basic",
			"audio/x-gsm",
			"audio/mpeg",
			"audio/mp4",
			"audio/ogg",
			"audio/x-pn-realaudio",
			"audio/voc",
			"audio/wav",
			"audio/webm"
		};

		FileService fileService;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();

		public AudioMediaInfoPlugin(FileService fileService)
		{
			this.fileService = fileService;
		}

		public string Name {
			get {
				return "audioMediaInfo";
			}
		}

		public string[] MimeTypes {
			get {
				return supportedMimeTypes;
			}
		}

		public void Init(IDbConnection dbcon)
		{
			// create the audioMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				string sql = "CREATE TABLE audioMediaInfo (id VARCHAR PRIMARY KEY, fails INTEGER(1), "+
					"durationMilliseconds INTEGER)";
				dbcmd.CommandText = sql;
				dbcmd.ExecuteNonQuery();
			}
		}

		public void ProcessContent(JsonValue data, JsonValue diff, string contentFilePath)
		{
			if(contentFilePath == null)
				return;

			long durationMilliseconds = 0;
			bool fails = true;

			double doubleDuration = Erasme.Cloud.Preview.ImageVideoPreview.GetVideoDuration(contentFilePath);
			if(doubleDuration != 0) {
				durationMilliseconds = (long)(doubleDuration * 1000);
				fails = false;
			}

			JsonValue audioMediaInfo = new JsonObject();
			diff["audioMediaInfo"] = audioMediaInfo;
			audioMediaInfo["durationMilliseconds"] = durationMilliseconds;
			audioMediaInfo["fails"] = fails;
		}

		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceContext> parents)
		{
			// contentRev == 0 => no file content
			if(value.ContainsKey("contentRev") && ((long)value["contentRev"] == 0))
				return;

			bool found = false;
			bool fails = true;
			long durationMilliseconds = 0;

			// select from the audioMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT fails,durationMilliseconds FROM audioMediaInfo WHERE id=@id";
				dbcmd.Transaction = transaction;
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(reader.Read()) {
						found = true;
						if(!reader.IsDBNull(0))
							fails = reader.GetBoolean(0);
						if(!reader.IsDBNull(1))
							durationMilliseconds = reader.GetInt64(1);
					}
					reader.Close();
				}
			}

			// if audioMediaInfo not found, try to build it now
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
						}, null, "Get audioMediaInfo for "+id, LongTaskPriority.High);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id] = task;
					}
				}
			}

			if(found && !fails) {
				JsonObject audioMediaInfo = new JsonObject();
				audioMediaInfo["durationMilliseconds"] = durationMilliseconds;
				value["audioMediaInfo"] = audioMediaInfo;
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
			long durationMilliseconds = 0;

			if(!diff.ContainsKey("audioMediaInfo"))
				return;

			// select from the audioMediaInfo table
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.CommandText = "SELECT fails,durationMilliseconds FROM audioMediaInfo WHERE id=@id";
				dbcmd.Transaction = transaction;
				dbcmd.Parameters.Add(new SqliteParameter("id", id));
				using(IDataReader reader = dbcmd.ExecuteReader()) {
					if(reader.Read()) {
						found = true;
						if(!reader.IsDBNull(0))
							fails = reader.GetBoolean(0);
						if(!reader.IsDBNull(1))
							durationMilliseconds = reader.GetInt64(1);
					}
					reader.Close();
				}
			}

			JsonValue audioMediaInfo = diff["audioMediaInfo"];
			if(audioMediaInfo.ContainsKey("fails"))
				fails = audioMediaInfo["fails"];
			if(audioMediaInfo.ContainsKey("durationMilliseconds"))
				durationMilliseconds = audioMediaInfo["durationMilliseconds"];

			// if audioMediaInfo not found, insert it
			if(!found) {
				// cache the result in the database
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "INSERT INTO audioMediaInfo (id,fails,durationMilliseconds) VALUES (@id,@fails,@durationMilliseconds)";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("fails", fails));
					dbcmd.Parameters.Add(new SqliteParameter("durationMilliseconds", durationMilliseconds));
					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("audioMediaInfo create fails");
				}
			}
			// else update it
			else {
				// cache the result in the database
				using(IDbCommand dbcmd = dbcon.CreateCommand()) {
					dbcmd.Transaction = transaction;
					dbcmd.CommandText = "UPDATE durationMilliseconds fails=@fails,durationMilliseconds=@durationMilliseconds WHERE id=@id";
					dbcmd.Parameters.Add(new SqliteParameter("id", id));
					dbcmd.Parameters.Add(new SqliteParameter("fails", fails));
					dbcmd.Parameters.Add(new SqliteParameter("durationMilliseconds", durationMilliseconds));
					if(dbcmd.ExecuteNonQuery() != 1)
						throw new Exception("audioMediaInfo update fails");
				}
			}

		}

		public void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data)
		{
			using(IDbCommand dbcmd = dbcon.CreateCommand()) {
				dbcmd.Transaction = transaction;
				dbcmd.CommandText = "DELETE FROM audioMediaInfo WHERE id=@id";
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

