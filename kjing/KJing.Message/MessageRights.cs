//
// MessageRights.cs
//
// Author:
//       Daniel Lacroix <dlacroix@erasme.org>
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

using System;
using Erasme.Http;
using Erasme.Json;
using Erasme.Cloud.Message;
using KJing.Directory;

namespace KJing.Message
{
	public class MessageRights: IMessageRights
	{
		DirectoryService directoryService;

		public MessageRights(DirectoryService directoryService)
		{
			this.directoryService = directoryService;
		}

		public void EnsureCanMonitorUser(HttpContext context, string user)
		{
			directoryService.EnsureIsAuthenticated(context);
			if(context.User != user)
				directoryService.EnsureRights(context, user, true, false, true);
		}

		public void EnsureCanCreateMessage(HttpContext context, string origin, string destination)
		{
			directoryService.EnsureIsAuthenticated(context);
			if(context.User != origin)
				directoryService.EnsureRights(context, origin, true, true, true);
		}

		public void EnsureCanReadMessage(HttpContext context, string origin, string destination)
		{
			directoryService.EnsureIsAuthenticated(context);
			if((context.User != origin) && (context.User != destination))
				directoryService.EnsureRights(context, origin, true, true, true);
		}

		public void EnsureCanUpdateMessage(HttpContext context, string origin, string destination)
		{
			directoryService.EnsureIsAuthenticated(context);
			if((context.User != origin) && (context.User != destination))
				directoryService.EnsureRights(context, origin, true, true, true);
		}

		public void EnsureCanDeleteMessage(HttpContext context, string origin, string destination)
		{
			directoryService.EnsureIsAuthenticated(context);
			if(context.User != origin)
				directoryService.EnsureRights(context, origin, true, true, true);
		}
	}
}
