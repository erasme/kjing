// PdfPlugin.cs
// 
//  Provide a PDF version of all text documents
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
using System.Collections;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Diagnostics;
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;
using Erasme.Cloud.Utils;

namespace KJing.Directory
{
	public class PdfPlugin: IFilePlugin
	{
		class UnoConv
		{
			Thread thread;
			internal string baseDirectory;

			public UnoConv(string baseDirectory)
			{
				this.baseDirectory = baseDirectory;
				thread = new Thread(ThreadStart);
				thread.Start();
			}

			void ThreadStart()
			{
				// unoconv listener
				ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/unoconv", "--listener");
				startInfo.UseShellExecute = false;
				startInfo.WorkingDirectory = baseDirectory;
				startInfo.EnvironmentVariables["HOME"] = baseDirectory;

				using(Process process = new Process()) {
					process.StartInfo = startInfo;
					process.Start();
					process.WaitForExit();
				}
			}
		}

		static object globalLock = new object();
		static UnoConv unoconv = null;

		static string[] supportedMimeTypes = new string[] {
			"application/vnd.oasis.opendocument.text",
			"application/vnd.oasis.opendocument.presentation",
			"application/vnd.oasis.opendocument.graphics",
			"application/vnd.sun.xml.writer",
			// Microsoft PowerPoint
			"application/vnd.ms-powerpoint",
			// Microsoft Word
			"application/msword",
			// Microsoft Word 2007
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			// RichText
			"text/richtext"
		};

		FileService fileService;
		object instanceLock = new object();
		Dictionary<string,LongTask> runningTasks = new Dictionary<string, LongTask>();

		public PdfPlugin(FileService fileService)
		{
			this.fileService = fileService;
			lock(globalLock) {
				if(unoconv == null) {
					string unoconvPath = System.IO.Path.Combine(fileService.Directory.BasePath, "unoconv");
					if(!System.IO.Directory.Exists(unoconvPath))
						System.IO.Directory.CreateDirectory(unoconvPath);
					unoconv = new UnoConv(unoconvPath);
				}
			}
		}

		public string Name {
			get {
				return "pdf";
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
			if(value.ContainsKey("cache") && (bool)value["cache"])
				return;

			string mimetype = value["mimetype"];

			// handle PDF
			JsonValue pdf = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, "pdf", filterBy, 0, groups, heritedRights, parents, true);
			if(pdf == null) {
				lock(instanceLock) {
					if(!runningTasks.ContainsKey(id)) {
						LongTask task = new LongTask(delegate {
							try {
								string localFile = fileService.GetLocalFile(id);
								string destFile = Path.Combine(fileService.Directory.TemporaryDirectory, Guid.NewGuid().ToString());
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["name"] = "pdf";

								if(ConvertToPdf(localFile, mimetype, destFile)) {
									jsonFile["mimetype"] = "application/pdf";
									jsonFile = fileService.CreateFile(jsonFile, destFile);
								}
								else {
									jsonFile["mimetype"] = "application/x-cache-error";
									jsonFile = fileService.CreateFile(jsonFile, (string)null);
								}
								// change the owner of the pdf because the pdf is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["pdf"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							catch(Exception) {
								JsonValue jsonFile = new JsonObject();
								jsonFile["type"] = "file";
								jsonFile["cache"] = true;
								jsonFile["parent"] = id;
								jsonFile["mimetype"] = "application/x-cache-error";
								jsonFile["name"] = "pdf";
								jsonFile = fileService.CreateFile(jsonFile, (string)null);
								// change the owner of the pdf because the pdf is embedded
								// and we want revision update, notifications...
								JsonValue jsonDiff = new JsonObject();
								jsonDiff["pdf"] = jsonFile;
								fileService.Directory.ChangeResource(id, jsonDiff);
							}
							finally {
								lock(instanceLock) {
									runningTasks.Remove(id);
								}
							}
						}, null, "Build PDF "+id, LongTaskPriority.Low);
						fileService.Directory.LongRunningTaskScheduler.Start(task);
						runningTasks[id] = task;
					}
					pdf = new JsonObject();
					pdf["type"] = "file";
					pdf["parent"] = id;
					pdf["id"] = id;
					pdf["name"] = "pdf";
					pdf["mimetype"] = "application/x-cache-progress";
				}
			}
			if((pdf != null) && (pdf["mimetype"] != "application/x-cache-error"))
				value["pdf"] = pdf;
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

		public bool ConvertToPdf(string filePath, string mimetype, string destPath)
		{
			string baseDirectory;
			lock(globalLock) {
				if(unoconv == null)
					throw new Exception("A PdfService instance need to be started to use ConvertToPdf");
				baseDirectory = unoconv.baseDirectory;
			}

			// unoconv
			string args = BuildArguments(new string[] {
				"-n", "--output", destPath, "-f", "pdf", filePath
			});


			//Console.WriteLine("ConvertToPdf /usr/bin/unoconv "+args+" (file size: "+(new FileInfo(filePath)).Length+")");
			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/unoconv", args);
			startInfo.UseShellExecute = false;
			startInfo.WorkingDirectory = baseDirectory;
			startInfo.EnvironmentVariables["HOME"] = baseDirectory;

			using(Process process = new Process()) {
				process.StartInfo = startInfo;
				process.Start();
				process.WaitForExit();
			}

			return File.Exists(destPath);
		}
	}
}



