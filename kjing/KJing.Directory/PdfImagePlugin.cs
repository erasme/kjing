// PdfImagePlugin.cs
// 
//  Convert PDF files to JPEG images
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
using Erasme.Cloud.Logger;

namespace KJing.Directory
{
	public class PdfImagePlugin: IFilePlugin
	{
		static string[] supportedMimeTypes = new string[] {
			"application/pdf"
		};

		FileService fileService;

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

		public void ProcessContent(JsonValue data, JsonValue diff, string contentFilePath)
		{
			if((contentFilePath != null) && ((data != null) || (diff != null))) {

				// build the pdf images
				string destDir = Path.Combine(fileService.Directory.TemporaryDirectory, Guid.NewGuid().ToString());
				try {
					System.IO.Directory.CreateDirectory(destDir);
					int count;
					if(BuildPages(contentFilePath, destDir, out count)) {
						JsonArray pages = new JsonArray();
						if(diff == null)
							data[Name] = pages;
						else
							diff[Name] = pages;

						for(int i = 0; i < count; i++) {
							JsonValue jsonPage = new JsonObject();
							jsonPage["type"] = "file:image:jpeg";
							jsonPage["position"] = i;
							jsonPage["cache"] = true;
							jsonPage["mimetype"] = "image/jpeg";
							jsonPage["name"] = i.ToString();
							string localPath = Path.Combine(destDir, i.ToString());
							jsonPage["localPath"] = localPath;

							pages.Add(jsonPage);

							// recursive process content
							fileService.ProcessContent(jsonPage, null, localPath);
						}
					}
				}
				catch(Exception e) {
					fileService.Directory.Logger.Log(LogLevel.Error, "PdfImagePlugin "+Name+" fails "+e.ToString());
				}
			}
		}


		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, List<string> groups, Rights heritedRights, List<ResourceContext> parents, ResourceContext context)
		{
			JsonValue pdfPages = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, "pdfPages", filterBy, groups, heritedRights, parents, context, true);

			if(pdfPages != null) {
				JsonArray pages = new JsonArray();
				value["pdfPages"] = pages;
				foreach(string pageId in (JsonArray)pdfPages["cacheChildren"]) {
					pages.Add(fileService.Directory.GetResource(dbcon, transaction, pageId, filterBy));
				}
			}
		}

		public void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
			string id = data["id"];

			if(data.ContainsKey(Name)) {
				JsonArray pages = (JsonArray)data[Name];

				JsonObject jsonFile = new JsonObject();
				jsonFile["type"] = "folder";
				jsonFile["parent"] = id;
				jsonFile["cache"] = true;
				jsonFile["uniqueName"] = true;
				jsonFile["name"] = "pdfPages";
				string pagesId = fileService.Directory.CreateResource(dbcon, transaction, jsonFile, changes)["id"];

				for(int i = 0; i < pages.Count; i++) {
					JsonValue jsonPage = pages[i];
					string localFile = jsonPage["localPath"];
					jsonPage["parent"] = pagesId;
					fileService.CreateFile(dbcon, transaction, jsonPage, localFile, changes);
				}
			}
		}

		public void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff, Dictionary<string, ResourceChange> changes)
		{
			if(diff.ContainsKey(Name)) {
				JsonArray pages = (JsonArray)diff[Name];

				JsonObject jsonFile = new JsonObject();
				jsonFile["type"] = "folder";
				jsonFile["parent"] = id;
				jsonFile["cache"] = true;
				jsonFile["uniqueName"] = true;
				jsonFile["name"] = "pdfPages";
				string pagesId = fileService.Directory.CreateResource(dbcon, transaction, jsonFile, changes)["id"];

				for(int i = 0; i < pages.Count; i++) {
					JsonValue jsonPage = pages[i];
					string localFile = jsonPage["localPath"];
					jsonPage["parent"] = pagesId;
					fileService.CreateFile(dbcon, transaction, jsonPage, localFile, changes);
				}
			}
		}

		public void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, Dictionary<string, ResourceChange> changes)
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

