// Setup.cs
// 
//  Setup of the KJing HTTP server
//
// Author(s):
//  Daniel Lacroix <dlacroix@erasme.org>
// 
// Copyright (c) 2013-2014 Departement du Rhone
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
using System.Xml.Serialization;

namespace KJing
{
	public class Setup
	{
		/// <summary>
		/// If debug is set to true, the server will prompt and halt
		/// on each exception. Handy for development but not for production 
		/// </summary>
		public bool Debug = false;

		/// <summary>
		/// The name of the server.
		/// </summary>
		[XmlAttribute]
		public string ServerName = "localhost";

		/// <summary>
		/// The TCP port to listen on.
		/// </summary>
		[XmlAttribute]
		public int Port = 80;
				
		/// <summary>
		/// Path to access
		/// </summary>
		[XmlAttribute]
		public string Path = "/cloud";
		
		/// <summary>
		/// Directory to save data
		/// </summary>
		[XmlAttribute]
		public string Storage = "/var/lib/kjing";

		/// <summary>
		/// Directory to save logs
		/// </summary>
		[XmlAttribute]
		public string Log = "/var/log/kjing";

		/// <summary>
		/// Directory to load shared static resources like web pages
		/// </summary>
		[XmlAttribute]
		public string Static = "/usr/share/kjing/";

		/// <summary>
		/// Name of the cookie to use for authentication session
		/// </summary>
		[XmlAttribute]
		public string AuthCookie = "KJING_AUTH";

		/// <summary>
		/// Name of the cookie to use for authentication session
		/// </summary>
		[XmlAttribute]
		public string AuthHeader = "x-kjing-authentication";
		
		/// <summary>
		/// Number of second to keep a user authenticate session active
		/// </summary>
		[XmlAttribute]
		public int AuthSessionTimeout = 10;

		[XmlAttribute]
		public string GoogleClientId = "client_id";
		
		[XmlAttribute]
		public string GoogleClientSecret = "client_secret";
		
		[XmlAttribute]
		public string GoogleAuthRedirectUrl = "http://localhost/googleoauth2";

		[XmlAttribute]
		public string FacebookClientId = "client_id";
		
		[XmlAttribute]
		public string FacebookClientSecret = "client_secret";
		
		[XmlAttribute]
		public string FacebookAuthRedirectUrl = "http://localhost/facebookoauth2";

		/// <summary>
		/// The SMTP server to use for send emails
		/// </summary>
		[XmlAttribute]
		public string SmtpServer = "localhost";

		/// <summary>
		/// The From email address to use when sending emails
		/// </summary>
		[XmlAttribute]
		public string SmtpFrom = "kjing-noreply@localhost";

		/// <summary>
		/// Heavy tasks are enqueued and run asynchronously.
		/// Set the number of thread to execute in parallel
		/// (for exemple number of processors * number of cores * 1.5)
		/// </summary>
		[XmlAttribute]
		public int MaximumConcurrency = 2;

		/// <summary>
		/// Directory to use for temporary files
		/// </summary>
		[XmlAttribute]
		public string TemporaryDirectory = "/var/lib/kjing/tmp";

		/// <summary>
		/// Set the HTTP Keep-Alive timeout in second
		/// </summary>
		[XmlAttribute]
		public double HttpKeepAliveTimeout = 10;

		/// <summary>
		/// Set the maximum request to handle in an HTTP Keep-Alive connection
		/// </summary>
		[XmlAttribute]
		public int HttpKeepAliveMax = 50;

		/// <summary>
		/// Set the default value to use for caching "cachable" data in seconds
		/// </summary>
		[XmlAttribute]
		public int DefaultCacheDuration = 3600*12;

		/// <summary>
		/// Allow the HTTP server to use GZip streams Set the default value to use for caching "cachable" data in seconds
		/// </summary>
		[XmlAttribute]
		public bool AllowGZip = false;

		/// <summary>
		/// The default quota in bytes for a newly created user account.
		/// -1 = infinite
		/// </summary>
		[XmlAttribute]
		public long DefaultBytesQuota = -1;

		/// <summary>
		/// Allow the HTTP server to use HTTPS streams. Set the default value is null and mean no HTTPS
		/// </summary>
		[XmlAttribute]
		public string ServerCertificateFile = null;

		/// <summary>
		/// If ServerCertificateFile is set, provide the file password
		/// </summary>
		[XmlAttribute]
		public string ServerCertificatePassword = null;
	}
}

