//
// FileIndexingPlugin.cs
// 
//  Provide a plugin to extract to data used to index files for full text search
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2015 Metropole de Lyon
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
using Mono.Data.Sqlite;
using Erasme.Json;
using Erasme.Http;
using Erasme.Cloud.Utils;
using Erasme.Cloud.Logger;
using KJing.Directory;

namespace KJing.FileIndexing
{

	public class FileIndexingPlugin: IFilePlugin
	{
		public FileIndexingPlugin()
		{
		}

		public string Name {
			get {
				return "fileindexing";
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
			if(!data["cache"]) {
				long size;
				if(diff.ContainsKey("size"))
					size = diff["size"];
				else if(data.ContainsKey("size"))
					size = data["size"];
				else
					size = 0;

				// dont index files bigger than 5 MB)
				if(size < 5000000) {
					if(data["mimetype"] == "text/plain") {
						using(StreamReader reader = File.OpenText(contentFilePath)) {
							diff["indexingContent"] = reader.ReadToEnd();
						}
					}
					else if(data["mimetype"] == "application/pdf") {
						PdfExtractor extractor = new PdfExtractor();
						diff["indexingContent"] = extractor.Process(contentFilePath, data["mimetype"]);
					}
				}
			}
		}

		public void Get(IDbConnection dbcon, IDbTransaction transaction, string id, JsonValue value, string filterBy, List<string> groups, Rights heritedRights, List<ResourceContext> parents, ResourceContext context)
		{
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
	}
}

