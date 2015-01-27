//
// PdfExtractor.cs
// 
//  Extract text data from PDF files for text indexing
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
using System.Diagnostics;
using System.Collections.Generic;

namespace KJing.FileIndexing
{
	public class PdfExtractor
	{
		public PdfExtractor()
		{
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

		public string Process(string file, string mimetype)
		{
			List<string> args = new List<string>();
			args.Add(file);
			args.Add("-");

			ProcessStartInfo startInfo = new ProcessStartInfo("/usr/bin/pdftotext", BuildArguments(args));
			startInfo.UseShellExecute = false;
			startInfo.RedirectStandardOutput = true;
			Process process = new Process();
			process.StartInfo = startInfo;
			process.Start();
			string output = process.StandardOutput.ReadToEnd();
			process.WaitForExit();
			process.Dispose();

			return output;
		}
	}
}

