// Storage.cs
// 
//  Service to store IO.Stream and/or files associated with a string key
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c)2014 Departement du Rhone
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
using IO = System.IO;

namespace KJing.Storage
{
	public class Storage
	{
		string basePath;
		string temporaryDirectory;

		public Storage(string basePath, string temporaryDirectory)
		{
			this.basePath = basePath;
			this.temporaryDirectory = temporaryDirectory;
			if(!System.IO.Directory.Exists(this.basePath))
				System.IO.Directory.CreateDirectory(this.basePath);
		}

		/// <summary>
		/// Gets or sets the <see cref="KJing.Storage.Storage"/> with the specified key.
		/// </summary>
		/// <param name="key">Key. Allowed symbols are [a-zA-Z0-9] (base62)</param>
		public IO.Stream this[string key]
		{
			get {
				return Get(key);
			}
			set {
				Add(key, value);
			}
		}

		public bool ContainsKey(string key)
		{
			return IO.File.Exists(IO.Path.Combine(GenerateFolders(key, false), key));
		}

		public void Add(string key, string tempFile)
		{
			IO.File.Move(tempFile, IO.Path.Combine(GenerateFolders(key, true), key));
		}

		public void Replace(string key, string tempFile)
		{
			string destFile = IO.Path.Combine(GenerateFolders(key, true), key);
			if(IO.File.Exists(destFile))
				IO.File.Replace(tempFile, destFile, null);
			else
				IO.File.Move(tempFile, destFile);
		}

		public void Add(string key, IO.Stream stream)
		{
			string tempFile = IO.Path.Combine(temporaryDirectory, Guid.NewGuid().ToString());
			IO.FileStream fileStream = new IO.FileStream(tempFile, IO.FileMode.CreateNew);
			stream.CopyTo(fileStream);
			Add(key, tempFile);
		}

		public void Remove(string key)
		{
			string filePath = IO.Path.Combine(GenerateFolders(key, false), key);
			if(IO.File.Exists(filePath))
				IO.File.Delete(filePath);
		}

		public IO.Stream Get(string key)
		{
			string localFile = GetLocalFile(key);
			if(localFile == null)
				return IO.Stream.Null;
			else
				return new IO.FileStream(localFile, IO.FileMode.Open, IO.FileAccess.Read, IO.FileShare.Read);
		}

		public string GetLocalFile(string key)
		{
			string filePath = IO.Path.Combine(GenerateFolders(key, false), key);
			if(IO.File.Exists(filePath))
				return filePath;
			else
				return null;
		}

		string GenerateFolders(string key, bool createIfNeeded)
		{
			string level1 = "00";
			string level2 = "00";
			string level3 = "00";
			if(key.Length >= 2)
				level1 = key.Substring(0, 2);
			if(key.Length >= 4)
				level2 = key.Substring(2, 2);
			if(key.Length >= 6)
				level3 = key.Substring(4, 2);
			// test if folders exists
			if(createIfNeeded) {
				if(!IO.Directory.Exists(IO.Path.Combine(this.basePath, level1)))
					IO.Directory.CreateDirectory(IO.Path.Combine(this.basePath, level1));
				if(!IO.Directory.Exists(IO.Path.Combine(this.basePath, level1, level2)))
					IO.Directory.CreateDirectory(IO.Path.Combine(this.basePath, level1, level2));
				if(!IO.Directory.Exists(IO.Path.Combine(this.basePath, level1, level2, level3)))
					IO.Directory.CreateDirectory(IO.Path.Combine(this.basePath, level1, level2, level3));
			}
			// return the folder to store the file
			return IO.Path.Combine(this.basePath, level1, level2, level3);
		}
	}
}

