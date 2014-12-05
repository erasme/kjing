// UploaderService.cs
// 
//  Handle retrieval of a file from a stream to create a local file
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
using System.Threading.Tasks;
using System.Collections.Generic;

namespace KJing.Directory
{
	public class UploaderService
	{
		public class Uploader: IDisposable
		{
			UploaderService service;
			Stream stream;

			internal Uploader(UploaderService service, string id, Stream stream)
			{
				this.service = service;
				Id = id;
				this.stream = stream;
			}

			public string Id { get; private set; }

			public async Task Run(string tmpFile)
			{
				using(FileStream fileStream = new FileStream(tmpFile, FileMode.CreateNew, FileAccess.Write)) {
					await stream.CopyToAsync(fileStream);
				}
			}

			public void Dispose()
			{
				lock(service.instanceLock) {
					service.uploaders.Remove(Id);
				}
			}
		}

		object instanceLock = new object();
		Dictionary<string, Uploader> uploaders = new Dictionary<string, Uploader>();

		public UploaderService()
		{
		}

		public Uploader Create(string id, Stream stream)
		{
			Uploader uploader;
			lock(instanceLock) {
				if(uploaders.ContainsKey(id))
					throw new Exception("Uploader id: "+id+" already exists");
				uploader = new Uploader(this, id, stream);
				uploaders[id] = uploader;
			}
			return uploader;
		}
	}
}

