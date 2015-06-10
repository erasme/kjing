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
			if((contentFilePath != null) && ((data != null) || (diff != null))) {
				bool cache = ((data != null) && data.ContainsKey("cache") && (bool)data["cache"]) ||
					((diff != null) && diff.ContainsKey("cache") && (bool)diff["cache"]);

				// cache file => no thumbnail
				if(cache)
					return;
				
				string mimetype = (data != null) ? data["mimetype"] : diff["mimetype"];

				// build the thumbnail
				try {
					string previewMimetype;
					string previewPath;
					string error;

					JsonValue jsonFile = new JsonObject();
					jsonFile["cache"] = true;
					jsonFile["name"] = Name;
					jsonFile["uniqueName"] = true;
					if(Erasme.Cloud.Preview.PreviewService.BuildPreview(
						fileService.Directory.TemporaryDirectory,
						contentFilePath, mimetype,
						width, height, out previewMimetype, out previewPath, out error)) {
						jsonFile["mimetype"] = previewMimetype;
						jsonFile["type"] = "file:"+previewMimetype.Replace('/', ':');
						jsonFile["localPath"] = previewPath;

						if(diff == null)
							data[Name] = jsonFile;
						else
							diff[Name] = jsonFile;

						// recursive process content 
						fileService.ProcessContent(jsonFile, null, previewPath);
					}
				}
				catch(Exception e) {
					fileService.Directory.Logger.Log(LogLevel.Error, "ThumbnailPlugin "+Name+" fails "+e.ToString());
				}
			}
		}

		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, List<string> groups, Rights heritedRights, List<ResourceContext> parents, ResourceContext context)
		{
			JsonValue thumbnailJson = fileService.Directory.GetChildResourceByName(dbcon, transaction, id, Name, filterBy, groups, heritedRights, parents, context, true);
			if(thumbnailJson != null)
				value[Name] = thumbnailJson;
		}

		public void Create(IDbConnection dbcon, IDbTransaction transaction, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
			if(data.ContainsKey(Name)) {
				data[Name]["parent"] = (string)data["id"];
				data[Name] = fileService.CreateFile(dbcon, transaction, data[Name], data[Name]["localPath"], changes);
			}
		}

		public void Change(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, JsonValue diff, Dictionary<string, ResourceChange> changes)
		{
			if(diff.ContainsKey(Name)) {
//				JsonValue thumbnailJson = fileService.Directory.GetChildResourceByName(dbcon, transaction, (string)data["id"], Name, true);
				diff[Name]["parent"] = (string)data["id"];
				diff[Name] = fileService.CreateFile(dbcon, transaction, diff[Name], diff[Name]["localPath"], changes);
//				if(thumbnailJson != null)
//					fileService.Directory.DeleteResource (dbcon, transaction, (string)thumbnailJson ["id"], changes);
			}
		}

		public void Delete(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue data, Dictionary<string, ResourceChange> changes)
		{
		}

		public Task ProcessRequestAsync(HttpContext context)
		{
			return Task.FromResult<Object>(null);
		}
	}
}

