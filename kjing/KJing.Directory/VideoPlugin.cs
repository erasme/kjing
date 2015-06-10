// VideoPlugin.cs
// 
//  Provide an MP4 and WEBM web compatibles version of video files
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2014 Departement du Rhone - 2015 Metropole de Lyon
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
	public class VideoPlugin: IFilePlugin
	{
		static string[] supportedMimeTypes = new string[] {
			"video/x-ms-asf",
			"video/avi",
			"video/avs-video",
			"video/x-dv",
			"video/dl",
			"video/fli",
			"video/gl",
			"video/mpeg",
			"video/mp4",
			"video/x-motion-jpeg",
			"video/quicktime",
			"video/x-sgi-movie",
			"video/x-qtc",
			"video/vnd.rn-realvideo",
			"video/webm"
		};

		FileService fileService;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();

		public VideoPlugin(FileService fileService)
		{
			this.fileService = fileService;
		}

		public string Name {
			get {
				return "video";
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

		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, List<string> groups, Rights heritedRights, List<ResourceContext> parents, ResourceContext context)
		{
			// contentRev == 0 => no file content
			if(value.ContainsKey("contentRev") && ((long)value["contentRev"] == 0))
				return;
			// no audio convertion for cached files
			if(value.ContainsKey("cache") && (bool)value["cache"])
				return;

			// handle MP4
			JsonValue videoMp4 = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, "videoMp4", filterBy, groups, heritedRights, parents, context, true);

			if(videoMp4 == null) {
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id + ":mp4")) {
						LongTask task = new LongTask(delegate {
							try {
								string localFile = fileService.GetLocalFile(id);
								string destFile = Path.Combine(fileService.Directory.TemporaryDirectory, Guid.NewGuid().ToString());
								JsonValue jsonFile = new JsonObject();
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["name"] = "videoMp4";
								if(BuildMp4(localFile, destFile)) {
									jsonFile["type"] = "file:video:mp4";
									jsonFile["mimetype"] = "video/mp4";
									jsonFile = fileService.CreateFile(jsonFile, destFile);
								}
								else {
									jsonFile["type"] = "file:application:x-cache-error";
									jsonFile["mimetype"] = "application/x-cache-error";
									jsonFile = fileService.CreateFile(jsonFile, (string)null);
								}
								// change the owner of the videoMp4 because the videoMp4 is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["videoMp4"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							catch(Exception e) {
								fileService.Directory.Logger.Log(Erasme.Cloud.Logger.LogLevel.Error, "Build MP4 video fails for "+id+", Exception: "+e.ToString());
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file:application:x-cache-error";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["mimetype"] = "application/x-cache-error";
								jsonFile["name"] = "videoMp4";
								jsonFile = fileService.CreateFile(jsonFile, (string)null);
								// change the owner of the videoMp4 because the videoMp4 is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["videoMp4"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id + ":mp4");
								}
							}
						}, null, "Build Video MP4 " + id, LongTaskPriority.Low);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id + ":mp4"] = task;

					}
					videoMp4 = new JsonObject();
					videoMp4["type"] = "file:application:x-cache-progress";
					videoMp4["parent"] = id;
					videoMp4["id"] = id + ":mp4";
					videoMp4["name"] = "videoMp4";
					videoMp4["mimetype"] = "application/x-cache-progress";
				}
			}
			Console.WriteLine("VideoPlugin.Get videoMp4");
			Console.WriteLine((videoMp4 == null) ? "null" : videoMp4.ToString());
			if((videoMp4 != null) && (videoMp4["mimetype"] != "application/x-cache-error"))
				value["videoMp4"] = videoMp4;

			// handle WEBM
			JsonValue videoWebm = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, "videoWebm", filterBy, groups, heritedRights, parents, context, true);
			if(videoWebm == null) {
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id + ":webm")) {
						LongTask task = new LongTask(delegate {
							try {
								string localFile = fileService.GetLocalFile(id);
								string destFile = Path.Combine(fileService.Directory.TemporaryDirectory, Guid.NewGuid().ToString());
								JsonValue jsonFile = new JsonObject();
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["name"] = "videoWebm";
								if(BuildWebm(localFile, destFile)) {
									jsonFile["type"] = "file:video:webm";
									jsonFile["mimetype"] = "video/webm";
									jsonFile = fileService.CreateFile(jsonFile, destFile);
								}
								else {
									jsonFile["type"] = "file:application:x-cache-error";
									jsonFile["mimetype"] = "application/x-cache-error";
									jsonFile = fileService.CreateFile(jsonFile, (string)null);
								}
								// change the owner of the videoWebm because the videoWebm is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["videoWebm"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							catch(Exception e) {
								fileService.Directory.Logger.Log(Erasme.Cloud.Logger.LogLevel.Error, "Build WebM video fails for "+id+", Exception: "+e.ToString());
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file:application:x-cache-error";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["mimetype"] = "application/x-cache-error";
								jsonFile["name"] = "videoWebm";
								jsonFile = fileService.CreateFile(jsonFile, (string)null);
								// change the owner of the videoWebm because the videoWebm is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["videoWebm"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id+":webm");
								}
							}
						}, null, "Build Video WEBM "+id, LongTaskPriority.Low);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id+":webm"] = task;
					}
					videoWebm = new JsonObject();
					videoWebm["type"] = "file:application:x-cache-progress";
					videoWebm["parent"] = id;
					videoWebm["id"] = id+":webm";
					videoWebm["name"] = "videoWebm";
					videoWebm["mimetype"] = "application/x-cache-progress";
				}
			}
			if((videoWebm != null) && (videoWebm["mimetype"] != "application/x-cache-error"))
				value["videoWebm"] = videoWebm;
		}

		public void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
		}

		public void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff, Dictionary<string, ResourceChange> changes)
		{
		}

		public void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
		}

		public Task ProcessRequestAsync(HttpContext context)
		{
			return Task.FromResult<Object>(null);
		}

		static string BuildArguments(List<string> args)
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

		bool BuildMp4(string sourceFile, string destinationFile)
		{
			double rotation = Erasme.Cloud.Preview.ImageVideoPreview.GetVideoRotation(sourceFile);
			double width; double height;
			Erasme.Cloud.Preview.ImageVideoPreview.GetVideoSize(sourceFile, out width, out height);

			List<string> args = new List<string>();
			args.Add("-loglevel"); args.Add("quiet");
			args.Add("-threads"); args.Add("1");
			args.Add("-i"); args.Add(sourceFile);
			args.Add("-f"); args.Add("mp4");
			args.Add("-vcodec"); args.Add("libx264");
			args.Add("-preset"); args.Add("slow");
			args.Add("-coder"); args.Add("0");
			args.Add("-map_metadata"); args.Add("-1");
			args.Add("-ab"); args.Add("64k");
			args.Add("-ar"); args.Add("44100");
			args.Add("-ac"); args.Add("1");
			if(rotation == 90) {
				args.Add("-vf");
				args.Add("transpose=0,hflip");
			}
			else if(rotation == 180) {
				args.Add("-vf");
				args.Add("vflip,hflip");
			}
			else if(rotation == 270) {
				args.Add("-vf");
				args.Add("transpose=0,vflip");
			}
			// variable depending on the quality expected
			int resizedHeight;
			// 720p
			if(height >= 720) {
				resizedHeight = 720;
				args.Add("-b:v"); args.Add("2560k");
			}
			// 480p
			else if(height >= 480) {
				resizedHeight = 480;
				args.Add("-b:v"); args.Add("1280k");
			}
			// 240p
			else {
				resizedHeight = 240;
				args.Add("-b:v"); args.Add("640k");
			}
			int resizedWidth = (int)(Math.Ceiling((((double)resizedHeight)*(width/height))/16)*16);
			args.Add("-s"); args.Add(resizedWidth+"x"+resizedHeight);

			args.Add(destinationFile);
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/ffmpegstatic", BuildArguments(args));

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

		bool BuildWebm(string sourceFile, string destinationFile)
		{
			double rotation = Erasme.Cloud.Preview.ImageVideoPreview.GetVideoRotation(sourceFile);
			double width; double height;
			Erasme.Cloud.Preview.ImageVideoPreview.GetVideoSize(sourceFile, out width, out height);

			List<string> args = new List<string>();
			args.Add("-loglevel"); args.Add("quiet");
			args.Add("-threads"); args.Add("1");
			args.Add("-i"); args.Add(sourceFile);
			args.Add("-f"); args.Add("webm");
			args.Add("-vcodec"); args.Add("libvpx");
			args.Add("-map_metadata"); args.Add("-1");
			args.Add("-acodec"); args.Add("libvorbis");
			args.Add("-ab"); args.Add("64k");
			args.Add("-ar"); args.Add("44100");
			args.Add("-ac"); args.Add("1");
			if(rotation == 90) {
				args.Add("-vf");
				args.Add("transpose=0,hflip");
			}
			else if(rotation == 180) {
				args.Add("-vf");
				args.Add("vflip,hflip");
			}
			else if(rotation == 270) {
				args.Add("-vf");
				args.Add("transpose=0,vflip");
			}

			// variable depending on the quality expected
			int resizedHeight;
			// 720p
			if(height >= 720) {
				resizedHeight = 720;
				args.Add("-b:v"); args.Add("2560k");
			}
			// 480p
			else if(height >= 480) {
				resizedHeight = 480;
				args.Add("-b:v"); args.Add("1280k");
			}
			// 240p
			else {
				resizedHeight = 240;
				args.Add("-b:v"); args.Add("640k");
			}
			int resizedWidth = (int)(Math.Ceiling((((double)resizedHeight)*(width/height))/16)*16);
			args.Add("-s"); args.Add(resizedWidth+"x"+resizedHeight);

			args.Add(destinationFile);

			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/ffmpegstatic", BuildArguments(args));

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
