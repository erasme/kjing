// AudioPlugin.cs
// 
//  Provide an MP3 and OGG web compatibles version of audio files
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2014 Departement du Rhone
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
using System.Collections;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Diagnostics;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;
using Erasme.Cloud.Utils;

namespace KJing.Directory
{
	public class AudioPlugin: IFilePlugin
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

		public AudioPlugin(FileService fileService)
		{
			this.fileService = fileService;
		}

		public string Name {
			get {
				return "audio";
			}
		}

		public string[] MimeTypes {
			get {
				return supportedMimeTypes;
			}
		}

		public void Init(IDbConnection dbcon)
		{
		}

		public void ProcessContent(JsonValue data, JsonValue diff, string contentFilePath)
		{
		}

		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceContext> parents)
		{
			// contentRev == 0 => no file content
			if(value.ContainsKey("contentRev") && ((long)value["contentRev"] == 0))
				return;
			// no audio convertion for cached files
			if(value.ContainsKey("cache") && (bool)value["cache"])
				return;

			// handle MP3
			JsonValue audioMp3 = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, "audioMp3", filterBy, 0, groups, heritedRights, parents, true);
			if(audioMp3 == null) {
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id + ":mp3")) {
						LongTask task = new LongTask(delegate {
							try {
								string localFile = fileService.GetLocalFile(id);
								string destFile = Path.Combine(fileService.Directory.TemporaryDirectory, Guid.NewGuid().ToString());
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["name"] = "audioMp3";
								if(BuildMp3(localFile, destFile)) {
									jsonFile["mimetype"] = "audio/mpeg";
									jsonFile = fileService.CreateFile(jsonFile, destFile);
								}
								else {
									jsonFile["mimetype"] = "application/x-cache-error";
									jsonFile = fileService.CreateFile(jsonFile, (string)null);
								}
								// change the owner of the audioMp3 because the audioMp3 is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["audioMp3"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							catch(Exception) {
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["mimetype"] = "application/x-cache-error";
								jsonFile["name"] = "audioMp3";
								jsonFile = fileService.CreateFile(jsonFile, (string)null);
								// change the owner of the audioMp3 because the audioMp3 is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["audioMp3"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id+":mp3");
								}
							}
						}, null, "Build MP3 "+id, LongTaskPriority.Low);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id+":mp3"] = task;
					}
					audioMp3 = new JsonObject();
					audioMp3["type"] = "file";
					audioMp3["parent"] = id;
					audioMp3["id"] = id+":mp3";
					audioMp3["name"] = "audioMp3";
					audioMp3["mimetype"] = "application/x-cache-progress";
				}
			}
			if((audioMp3 != null) && (audioMp3["mimetype"] != "application/x-cache-error"))
				value["audioMp3"] = audioMp3;

			// handle OGG
			JsonValue audioOgg = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, "audioOgg", filterBy, 0, groups, heritedRights, parents, true);
			if(audioOgg == null) {
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id + ":ogg")) {
						LongTask task = new LongTask(delegate {
							try {
								string localFile = fileService.GetLocalFile(id);
								string destFile = Path.Combine(fileService.Directory.TemporaryDirectory, Guid.NewGuid().ToString());
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["name"] = "audioOgg";
								if(BuildOgg(localFile, destFile)) {
									jsonFile["mimetype"] = "audio/ogg";
									jsonFile = fileService.CreateFile(jsonFile, destFile);
								}
								else {
									jsonFile["mimetype"] = "application/x-cache-error";
									jsonFile = fileService.CreateFile(jsonFile, (string)null);
								}
								// change the owner of the audioOgg because the audioOgg is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["audioOgg"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							catch(Exception) {
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["mimetype"] = "application/x-cache-error";
								jsonFile["name"] = "audioOgg";
								jsonFile = fileService.CreateFile(jsonFile, (string)null);
								// change the owner of the audioOgg because the audioOgg is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["audioOgg"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id+":ogg");
								}
							}
						}, null, "Build OGG "+id, LongTaskPriority.Low);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id+":ogg"] = task;
					}
					audioOgg = new JsonObject();
					audioOgg["type"] = "file";
					audioOgg["parent"] = id;
					audioOgg["id"] = id+":ogg";
					audioOgg["name"] = "audioOgg";
					audioOgg["mimetype"] = "application/x-cache-progress";
				}
			}
			if((audioOgg != null) && (audioOgg["mimetype"] != "application/x-cache-error"))
				value["audioOgg"] = audioOgg;
		}

		public void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data)
		{
		}

		public void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff)
		{
		}

		public void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data)
		{
		}

		public Task ProcessRequestAsync(HttpContext context)
		{
			return Task.FromResult<Object>(null);
		}

		static string BuildArguments(string[] args)
		{
			string res = "";
			foreach(string arg in args) {
				string tmp = (string)arg.Clone();
				tmp = tmp.Replace("'", "\\'");
				if(res != "")
					res += " ";
				res += "'"+tmp+"'";
			}
			return res;
		}

		bool BuildMp3(string sourceFile, string destinationFile)
		{
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/ffmpegstatic", BuildArguments(new string[] {
				"-loglevel", "quiet", "-threads", "1",
				"-i", sourceFile, "-map", "a",
				"-f", "mp3", "-ab", "64k", 
				"-ar", "44100", "-ac", "1",
				destinationFile
			}));

			using(Process process = new Process()) {
				process.StartInfo = startInfo;
				process.Start();
				process.WaitForExit();
			}
			// check if the destination file exists and is not empty
			if(System.IO.File.Exists(destinationFile)) {
				System.IO.FileInfo fileInfo = new System.IO.FileInfo(destinationFile);
				if(fileInfo.Length == 0) {
					fileInfo.Delete();
					return false;
				}
				return true;
			}
			return false;
		}

		bool BuildOgg(string sourceFile, string destinationFile)
		{
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/ffmpegstatic", BuildArguments(new string[] {
				"-loglevel", "quiet", "-threads", "1",
				"-i", sourceFile, "-map", "a",
				"-f", "ogg", "-ab", "64k", 
				"-ar", "44100", "-ac", "1", "-acodec", "libvorbis",
				destinationFile
			}));
				
			using(Process process = new Process()) {
				process.StartInfo = startInfo;
				process.Start();
				process.WaitForExit();
			}
			// check if the destination file exists and is not empty
			if(System.IO.File.Exists(destinationFile)) {
				System.IO.FileInfo fileInfo = new System.IO.FileInfo(destinationFile);
				if(fileInfo.Length == 0) {
					fileInfo.Delete();
					return false;
				}
				return true;
			}
			return false;
		}
	}
}

