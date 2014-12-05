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
using System.Text;
using System.Globalization;
using System.Threading.Tasks;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Logger;
using Erasme.Cloud.Authentication;
using Erasme.Cloud.Google;
using Erasme.Cloud.Facebook;
using Erasme.Cloud.Preview;
using Erasme.Cloud.Manage;
using Erasme.Cloud.StaticFiles;
using Erasme.Cloud.Utils;
using KJing.Directory;
using KJing.Manage;

namespace KJing
{
	public class Server: HttpServer
	{
		AuthSessionService authSessionService;

		public Server(Setup setup): base(setup.Port)
		{
			Setup = setup;

			//StopOnException = true;
			AllowGZip = Setup.AllowGZip;
			KeepAliveMax = Setup.HttpKeepAliveMax;
			KeepAliveTimeout = (int)Setup.HttpKeepAliveTimeout;

			// define the logger which handle logs
			Logger = new FileLogger(Setup.Log+"/kjing.log");
			// define the task factory for long running tasks
			LongRunningTaskScheduler = new PriorityTaskScheduler(Setup.MaximumConcurrency);

			authSessionService = new AuthSessionService(
				Setup.Storage+"/authsession/", Setup.AuthSessionTimeout, Setup.AuthHeader,
				Setup.AuthCookie);

			PathMapper mapper = new PathMapper();
			Add(mapper);

			// authentication session web service
			mapper.Add(Setup.Path+"/authsession", authSessionService);

			// directory service
			DirectoryService directoryService = new DirectoryService(
				Setup.Storage + "/directory", authSessionService, Setup.AuthHeader, Setup.AuthCookie,
				Setup.TemporaryDirectory, Setup.DefaultCacheDuration, Logger, LongRunningTaskScheduler);

			// management
			ManageService manageService = new ManageService(LongRunningTaskScheduler);
			manageService.Rights = new ManageRights(directoryService);
			mapper.Add(Setup.Path+"/status", manageService);

			mapper.Add(Setup.Path, directoryService);

			// static file distribution (web app)
			Add(new StaticFilesService(Setup.Static+"/www/", Setup.DefaultCacheDuration));

		}

		public Setup Setup { get; private set; }

		public ILogger Logger { get; private set; }

		public PriorityTaskScheduler LongRunningTaskScheduler { get; private set; }

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
				if(webException.Exception != null)
					exception = webException.Exception;
			}
				
			StringBuilder log = new StringBuilder();

			// remote address
			log.Append(context.Request.RemoteEndPoint.ToString());
			log.Append(" ");

			// x-forwarded-for
			if(context.Request.Headers.ContainsKey("x-forwarded-for")) {
				log.Append("[");
				log.Append(context.Request.Headers["x-forwarded-for"]);
				log.Append("] ");
			}

			// user
			if(context.User != null) {
				log.Append(context.User);
				log.Append(" ");
			}
			else
				log.Append("- ");

			// request 
			log.Append("\"");
			log.Append(context.Request.Method);
			log.Append(" ");
			log.Append(context.Request.FullPath);
			log.Append("\" ");
			// response
			if(context.WebSocket != null)
				log.Append("WS ");
			else {
				log.Append(context.Response.StatusCode);
				log.Append(" ");
			}
			// bytes received
			log.Append(context.Request.ReadCounter);
			log.Append("/");
			log.Append(context.Request.WriteCounter);
			log.Append(" ");
			// time
			log.Append(Math.Round((DateTime.Now - context.Request.StartTime).TotalMilliseconds).ToString(CultureInfo.InvariantCulture));
			log.Append("ms\n");
			// exception details
			log.Append(exception.ToString());

			// write the log
			Logger.Log(LogLevel.Debug, log.ToString());
		}
	}
}
