// ThumbnailPlugin.cs
// 
//  Provide an JPEG or PNG images thumbnail of all possible files
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
using System.Data;
using System.Collections;
using System.Threading.Tasks;
using System.Collections.Generic;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;
using Erasme.Cloud.Utils;
using Erasme.Cloud.Logger;

namespace KJing.Directory
{
	public class ThumbnailPlugin: IFilePlugin
	{
		FileService fileService;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();
		string name;
		int width;
		int height;

		public ThumbnailPlugin(FileService fileService, string name, int width, int height)
		{
			this.fileService = fileService;
			this.name = name;
			if(this.name == null)
				this.name = "thumbnail";
			this.width = width;
			this.height = height;

		}

		public string Name {
			get {
				return name;
			}
		}

		public string[] MimeTypes {
			get {
				return new string[] { "*/*" };
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
			// cache file => no thumbnail
			if(value.ContainsKey("cache") && (bool)value["cache"])
				return;

			string mimetype = value["mimetype"];

			JsonValue thumbnailJson = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, Name, filterBy, 0, groups, heritedRights, parents, true);

			if(thumbnailJson == null) {
				LongTask task = null;
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id)) {

						task = new LongTask(delegate {
							try {
								string previewMimetype;
								string previewPath;
								string error;

								string localFile = fileService.GetLocalFile(id);

								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["name"] = Name;
								jsonFile["uniqueName"] = true;
								if(Erasme.Cloud.Preview.PreviewService.BuildPreview(
									   fileService.Directory.TemporaryDirectory,
									   localFile, mimetype,
									   width, height, out previewMimetype, out previewPath, out error)) {
									jsonFile["mimetype"] = previewMimetype;

									JsonValue jsonDiff = new JsonObject();

									jsonDiff[Name] = fileService.CreateFile(jsonFile, previewPath);
									// change the owner of the thumb because the thumbnail is embedded
									// and we want revision update, notifications...
									fileService.Directory.ChangeResource(id, jsonDiff);
								}
								else {
									jsonFile["mimetype"] = "application/x-cache-error";
									fileService.CreateFile(jsonFile, (string)null);
								}
							}
							catch(Exception e) {
								fileService.Directory.Logger.Log(LogLevel.Error, "ThumbnailPlugin "+Name+" fails for "+id+": "+e.ToString());

								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["mimetype"] = "application/x-cache-error";
								jsonFile["name"] = Name;
								jsonFile["uniqueName"] = true;
								fileService.CreateFile(jsonFile, (string)null);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id);
								}
							}
						}, null, "Build " + Name + " for " + id, LongTaskPriority.Normal);
						runningTasks[id] = task;
					}
				}
				if(task != null)
					fileService.Directory.LongRunningTaskScheduler.Start(task);
			}

			if((thumbnailJson != null) && (thumbnailJson["mimetype"] != "application/x-cache-error"))
				value[Name] = thumbnailJson;
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
	}
}

