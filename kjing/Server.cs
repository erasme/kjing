// Server.cs
// 
//  The KJing HTTP server. Provide all the services
//  of KJing
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
using System.Globalization;
using System.Threading.Tasks;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Authentication;
using Erasme.Cloud.Queue;
using Erasme.Cloud.HttpProxy;
using Erasme.Cloud.Google;
using Erasme.Cloud.Facebook;
using Erasme.Cloud.Mime;
using Erasme.Cloud.Storage;
using Erasme.Cloud.Preview;
using Erasme.Cloud.Audio;
using Erasme.Cloud.Video;
using Erasme.Cloud.Pdf;
using Erasme.Cloud.Message;
using Erasme.Cloud.Manage;
using Erasme.Cloud.StaticFiles;
using KJing.Directory;

namespace KJing
{
	public class Server: HttpServer
	{
		AuthSessionService authSessionService;

		public Server(Setup setup): base(setup.Port)
		{
			Setup = setup;

			AllowGZip = Setup.AllowGZip;

			// define the logger which handle logs
			Logger = new FileLogger(Setup.Log+"/kjing.log");
			// define the task factory for long running tasks
			LongRunningTaskFactory = new TaskFactory(new Erasme.Cloud.Utils.LimitedConcurrencyTaskScheduler(Setup.MaximumConcurrency));

			authSessionService = new AuthSessionService(
				Setup.Storage+"/authsession/", Setup.AuthSessionTimeout, Setup.AuthHeader,
				Setup.AuthCookie);
			// plugin to handle auth sessions
			Add(new AuthSessionPlugin(authSessionService, Setup.AuthHeader, Setup.AuthCookie));

			PathMapper mapper = new PathMapper();
			Add(mapper);

			// authentication session web service
			mapper.Add(Setup.Path+"/authsession", authSessionService);

			// file storage
			mapper.Add(Setup.Path+"/mimeicon", new MimeIconService(
				Setup.Static+"/mimeicon/", Setup.DefaultCacheDuration));
			StorageService storageService = new StorageService(
				Setup.Storage+"/storage/", Setup.TemporaryDirectory, Setup.DefaultCacheDuration, Logger);
			mapper.Add(Setup.Path+"/storage", storageService);
			mapper.Add(Setup.Path+"/preview", new PreviewService(
				Setup.Storage+"/preview/", storageService, 64, 64, Setup.TemporaryDirectory,
				Setup.DefaultCacheDuration, Logger));
			mapper.Add(Setup.Path+"/previewhigh", new PreviewService(
				Setup.Storage+"/previewhigh/", storageService, 1024, 768, Setup.TemporaryDirectory,
				Setup.DefaultCacheDuration, Logger));
			mapper.Add(Setup.Path+"/audio", new AudioService(
				Setup.Storage+"/audio/", storageService, Setup.TemporaryDirectory, Setup.DefaultCacheDuration,
				LongRunningTaskFactory));
			mapper.Add(Setup.Path+"/video", new VideoService(
				Setup.Storage+"/video/", storageService, Setup.TemporaryDirectory, Setup.DefaultCacheDuration,
				LongRunningTaskFactory));
			mapper.Add(Setup.Path+"/pdf", new PdfService(
				Setup.Storage+"/pdf/", storageService, Setup.TemporaryDirectory, Setup.DefaultCacheDuration,
				LongRunningTaskFactory));

			// management
			mapper.Add(Setup.Path+"/status", new ManageService());

			// directory service
			mapper.Add(Setup.Path, new DirectoryService(
				Setup.Storage+"/directory", authSessionService, Setup.AuthHeader, Setup.AuthCookie,
				storageService, Setup.TemporaryDirectory, Setup.DefaultCacheDuration, Logger));

			// static file distribution (web app)
			Add(new StaticFilesService(Setup.Static+"/www/", Setup.DefaultCacheDuration));

		}

		public Setup Setup { get; private set; }

		public ILogger Logger { get; private set; }

		public TaskFactory LongRunningTaskFactory { get; private set; }

		protected override async Task ProcessRequestAsync(HttpContext context)
		{
			await base.ProcessRequestAsync(context);
			// log the request

			// remote address
			string log = context.Request.RemoteEndPoint.ToString()+" ";
			// user
			if(context.User != null)
				log += context.User+" ";
			else
				log += "- ";
			// request 
			log += "\""+context.Request.Method+" "+context.Request.FullPath+"\" ";
			// response
			if(context.WebSocket != null)
				log += "WS ";
			else
				log += context.Response.StatusCode+" ";
			// bytes received
			log += context.Request.ReadCounter+"/"+context.Request.WriteCounter+" ";
			// time
			log += Math.Round((DateTime.Now - context.Request.StartTime).TotalMilliseconds).ToString(CultureInfo.InvariantCulture)+"ms";

			// write the log
			Logger.Log(LogLevel.Debug, log);
		}

		protected override void OnWebSocketHandlerMessage(WebSocketHandler handler, string message)
		{
			// log the message

			// remote address
			string log = handler.Context.Request.RemoteEndPoint.ToString()+" ";
			// user
			if(handler.Context.User != null)
				log += handler.Context.User+" ";
			else
				log += "- ";
			// request 
			log += "\"WSMI "+handler.Context.Request.FullPath+"\" \""+message+"\"";

			// write the log
			Logger.Log(LogLevel.Debug, log);

			// handle the message
			base.OnWebSocketHandlerMessage(handler, message);
		}

		protected override void WebSocketHandlerSend(WebSocketHandler handler, string message)
		{
			base.WebSocketHandlerSend(handler, message);

			// log the message

			// remote address
			string log = handler.Context.Request.RemoteEndPoint.ToString()+" ";
			// user
			if(handler.Context.User != null)
				log += handler.Context.User+" ";
			else
				log += "- ";
			// request 
			log += "\"WSMO "+handler.Context.Request.FullPath+"\" \""+message+"\"";

			// write the log
			Logger.Log(LogLevel.Debug, log);
		}

		protected override void OnProcessRequestError(HttpContext context, Exception exception)
		{
			base.OnProcessRequestError(context, exception);
			// handle web exceptions
			if((exception is WebException) && (context.WebSocket == null)) {
				WebException webException = (WebException)exception;
				context.Response.StatusCode = webException.HttpStatus;
				JsonValue json = new JsonObject();
				json["code"] = webException.Code;
				json["detail"] = webException.Detail;
				context.Response.Content = new JsonContent(json);
			}
			else {
				// remote address
				string log = context.Request.RemoteEndPoint.ToString() + " ";
				// user
				if(context.User != null)
					log += context.User + " ";
				else
					log += "- ";

				// request 
				log += "\"" + context.Request.Method + " " + context.Request.FullPath + "\" ";
				// response
				if(context.WebSocket != null)
					log += "WS ";
				else
					log += context.Response.StatusCode + " ";
				// bytes received
				log += context.Request.ReadCounter + "/" + context.Request.WriteCounter + " ";
				// time
				log += Math.Round((DateTime.Now - context.Request.StartTime).TotalMilliseconds).ToString(CultureInfo.InvariantCulture) + "ms\n";
				// exception details
				log += exception.ToString();

				// write the log
				Logger.Log(LogLevel.Debug, log);
			}
		}
	}
}
