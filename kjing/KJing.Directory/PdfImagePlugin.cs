// PdfImagePlugin.cs
// 
//  Convert PDF files to JPEG images
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
	public class PdfImagePlugin: IFilePlugin
	{
		static string[] supportedMimeTypes = new string[] {
			"application/pdf"
		};

		FileService fileService;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();

		public PdfImagePlugin(FileService fileService)
		{
			this.fileService = fileService;
		}

		public string Name {
			get {
				return "pdfImage";
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

		public void ProcessContent(JsonValue data, string contentFilePath)
		{
		}

		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, int depth, List<string> groups, Rights heritedRights, List<ResourceRights> parents)
		{
			// contentRev == 0 => no file content
			if(value.ContainsKey("contentRev") && ((long)value["contentRev"] == 0))
				return;

			JsonValue pdfPages = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, "pdfPages", filterBy, 1, groups, heritedRights, parents, true);
			if(pdfPages == null) {
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id+":pdfPages")) {
						LongTask task = new LongTask(delegate {
							string destDir = Path.Combine(fileService.Directory.TemporaryDirectory, Guid.NewGuid().ToString());
							try {
								string localFile = fileService.GetLocalFile(id);
								System.IO.Directory.CreateDirectory(destDir);
								JsonValue jsonFile;
								int count;
								if(BuildPages(localFile, destDir, out count)) {

									// build all pages in an atomic manner

									lock(fileService.Directory.DbCon) {

										using(IDbTransaction transaction2 = fileService.Directory.DbCon.BeginTransaction()) {

											jsonFile = new JsonObject();
											jsonFile["type"] = "folder";
											jsonFile["parent"] = id;
											jsonFile["cache"] = true;
											jsonFile["name"] = "pdfPages";
											//jsonFile = fileService.Directory.CreateResource(jsonFile);
											//string pagesId = jsonFile["id"];
											string pagesId = fileService.Directory.CreateResource(fileService.Directory.DbCon, transaction2, jsonFile);

											for(int i = 0; i < count; i++) {
												JsonValue jsonPage = new JsonObject();
												jsonPage["type"] = "file";
												jsonPage["parent"] = pagesId;
												jsonPage["position"] = i;
												jsonPage["cache"] = true;
												jsonPage["mimetype"] = "image/jpeg";
												jsonPage["name"] = i.ToString();
												fileService.CreateFile(fileService.Directory.DbCon, transaction2, jsonPage, Path.Combine(destDir, i.ToString()));
												//fileService.CreateFile(jsonPage, Path.Combine(destDir, i.ToString()));
											}
											transaction2.Commit();
										}
									}
								}
								else {
									jsonFile = new JsonObject();
									jsonFile["type"] = "file";
									jsonFile["cache"] = true;
									jsonFile["parent"] = id;
									jsonFile["mimetype"] = "application/x-cache-error";
									jsonFile["name"] = "pdfPages";
									jsonFile = fileService.CreateFile(jsonFile, (string)null);
								}
								// change the owner of the pdfPages because the pdfPages is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["pdfPages"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							catch(Exception) {
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["mimetype"] = "application/x-cache-error";
								jsonFile["name"] = "pdfPages";
								jsonFile = fileService.CreateFile(jsonFile, (string)null);
								// change the owner of the pdfPages because the pdfPages is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["pdfPages"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id+":pdfPages");
								}
							}
						}, null, "Build PDF pages images "+id, LongTaskPriority.Normal);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id+":pdfPages"] = task;
					}
					pdfPages = new JsonObject();
					pdfPages["type"] = "file";
					pdfPages["parent"] = id;
					pdfPages["id"] = id+":pdfPages";
					pdfPages["name"] = "pdfPages";
					pdfPages["mimetype"] = "application/x-cache-progress";
				}
			}

			if((pdfPages != null) && !((pdfPages["type"] == "file") && (pdfPages["mimetype"] == "application/x-cache-error")))
				value["pdfPages"] = pdfPages;
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

		bool BuildPages(string pdfFile, string pagesPath, out int count)
		{
			// build the image of the page
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/pdftoppm", BuildArguments(new string[] {
				"-jpeg", "-scale-to", "2048",
				pdfFile,
				pagesPath+"/page"
			}));

			using(Process process = new Process()) {
				process.StartInfo = startInfo;
				process.Start();
				process.WaitForExit();
			}

			int countPages = 0;
			foreach(string file in System.IO.Directory.EnumerateFiles(pagesPath)) {
				int pos = file.IndexOf("page-");
				if(pos != -1) {
					string tmp = file.Substring(pos+5);
					long pagePosition = Convert.ToInt64(tmp.Substring(0, tmp.Length - 4));
					string destFile = Path.Combine(pagesPath, (pagePosition-1).ToString());
					File.Move(file, destFile);
					countPages++;
				}
			}
			count = countPages;
			return true;
		}
	}
}

