// Program.cs
// 
//  Simple test program to talk to an AirPlay device
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
using System.Threading;
using System.Collections.Generic;
using System.Security.Cryptography;
using Erasme.Http;
using Mono.Zeroconf;

namespace TestAirPlay
{
	class MainClass
	{
		public static string AirPlayHost = null;//"192.168.0.117";
		public static int AirPlayPort = 7000;
		public static string AirPlayDeviceName = "Apple TV";
		public static string UserAgent = "iTunes/10.6 (Macintosh; Intel Mac OS X 10.7.3) AppleWebKit/535.18.5";
		public static string XAppleDeviceID = "0x74d02b158566";
		public static string XAppleSessionID = Guid.NewGuid().ToString();

		public static void DumpResponse(HttpClientResponse response)
		{
			Console.WriteLine(response.Status);
			Console.WriteLine();
			Console.WriteLine(response.ReadAsString());
		}

		public static void SendPhotos(double delay, params string[] files)
		{
			using(HttpClient client = HttpClient.Create(AirPlayHost, AirPlayPort)) {

				foreach(string file in files) {

					HttpClientRequest request = new HttpClientRequest();
					request.Method = "PUT";
					request.Path = "/photo";

					request.Headers["user-agent"] = UserAgent;
					request.Headers["x-apple-device-id"] = XAppleDeviceID;
					request.Headers["x-apple-session-id"] = XAppleSessionID;

					//request.Headers["authorization"] = "Digest username=\"AirPlay\"";

					request.Headers["content-type"] = "image/jpeg";
					request.Content = new FileContent(file);
					client.SendRequest(request);
					HttpClientResponse response = client.GetResponse();

					// handle password
					if((response.StatusCode == 401) && response.Headers.ContainsKey("www-authenticate")) {
						string scheme;
						Dictionary<string,string> authHeader = Erasme.Http.WWWAuthentication.Decode(response.Headers["www-authenticate"], out scheme);
						Console.WriteLine("Scheme: " + scheme);
						Console.WriteLine("realm: " + authHeader["realm"]);
						Console.WriteLine("nonce: " + authHeader["nonce"]);

						MD5 md5 = MD5.Create();
						md5.ComputeHash(Encoding.ASCII.GetBytes("AirPlay"+"abc"+authHeader["nonce"]));

//						request.Headers["authorization"] = "Digest realm=\""+authHeader["realm"]+
//							"\", response=\""++"\"";
					}

					Thread.Sleep(TimeSpan.FromSeconds(delay));
				}
			}
		}

		public static void SendMovie(string url)
		{
			using(HttpClient client = HttpClient.Create(AirPlayHost, AirPlayPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "POST";
				request.Path = "/play";

				request.Headers["user-agent"] = UserAgent;
				request.Headers["x-apple-device-id"] = XAppleDeviceID;
				request.Headers["x-apple-session-id"] = XAppleSessionID;

				request.Headers["content-type"] = "text/parameters";
				request.Content = new StringContent("Content-Location: "+url+"\r\nStart-Position: 0.0\r\n");
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				DumpResponse(response);

				client.WaitForRemoteClose();
				Console.WriteLine("Remote connection closed");
			}
		}


		public static void Main(string[] args)
		{
			Semaphore airPlayFound = new Semaphore(0, 1);

			// Bonjour protocol
			ServiceBrowser browser = new ServiceBrowser();
			browser.ServiceAdded += (object o, ServiceBrowseEventArgs sArgs) => {
//				Console.WriteLine ("Found Service: {0}", sArgs.Service.Name);
				sArgs.Service.Resolved += delegate (object o2, ServiceResolvedEventArgs srArgs) {
					IResolvableService s = (IResolvableService)srArgs.Service;
//					Console.WriteLine ("Resolved Service: {0} - {1}:{2} ({3} TXT record entries)", 
//					                   s.FullName, s.HostEntry.AddressList[0], s.Port, s.TxtRecord.Count);

					AirPlayHost = s.HostEntry.AddressList[0].ToString();
					AirPlayPort = s.Port;
					AirPlayDeviceName = s.Name;

					airPlayFound.Release();
				};
				sArgs.Service.Resolve();
			};

			// search for airplay devices
			browser.Browse(0, AddressProtocol.IPv4, "_airplay._tcp", "local");

			Console.WriteLine("Search for AirPlay device...");

			airPlayFound.WaitOne();

			Console.WriteLine("Found " + AirPlayDeviceName + " (IP: " + AirPlayHost + ")");

			using(HttpClient eventClient = HttpClient.Create(AirPlayHost, AirPlayPort)) {
				HttpClientRequest eventRequest = new HttpClientRequest();
				eventRequest.Method = "POST";
				eventRequest.Path = "/reverse";

				eventRequest.Headers["upgrade"] = "PTTH/1.0";
				eventRequest.Headers["connection"] = "Upgrade";
				eventRequest.Headers["x-apple-purpose"] = "event";

				eventRequest.Headers["user-agent"] = UserAgent;
				eventRequest.Headers["x-apple-device-id"] = XAppleDeviceID;
				eventRequest.Headers["x-apple-session-id"] = XAppleSessionID;

				eventClient.SendRequest(eventRequest);
				//HttpClientResponse eventResponse = 
				eventClient.GetResponse();

				//SendMovie("http://daniel.erasme.lan:8000/cloud/video/94/3141");

				SendPhotos(5, "photo1.jpg", "photo2.jpg", "photo3.jpg");


				//SendMovie("http://daniel.erasme.lan:8000/cloud/audio/100/3168");
			}
		}
	}
}
