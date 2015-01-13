﻿using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using Erasme.Http;
using Erasme.Json;

namespace TestKJing
{
	public class MainClass
	{
		public delegate bool TestHandler();
		static int NbRequest = 100;
		static int NbThread = 4;
		static int SlowRequestLevel = 50;
		static int ServerPort = 3333;
		static string ServerHost = "localhost";

		static string TestUserId = null;
		static string TestUserLogin = "testlogin";
		static string TestUserPassword = "testlogin1234";
		static string TestUserAuthorization;

		public static bool TestStaticFilesService()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "GET";
				request.Path = "/admin/index-debug.html";
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200) && response.Headers["content-type"].StartsWith("text/html");
				if(done)
					response.ReadAsString();
			}
			return done;
		}

		public static bool TestCreateUser()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "POST";
				request.Path = "/cloud/user";
				JsonObject json = new JsonObject();
				json["type"] = "user";
				json["firstname"] = "Test";
				json["lastname"] = "Test";
				json["login"] = TestUserLogin;
				json["password"] = TestUserPassword;
				request.Content = new JsonContent(json);
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200) && response.Headers["content-type"].StartsWith("application/json");
				if(done) {
					JsonValue res = response.ReadAsJson();
					TestUserId = (string)res["id"];
					TestUserAuthorization = "basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes(TestUserLogin + ":" + TestUserPassword));
				}
			}
			return done;
		}

		public static bool TestDeleteUser()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "DELETE";
				request.Path = "/cloud/user/"+TestUserId;
				request.Headers["authorization"] = TestUserAuthorization;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200);
			}
			return done;
		}

		public static void Display(string desc, TestHandler handler)
		{
			Console.Write("Test "+desc+": ");
			if(handler()) {
				Console.ForegroundColor = ConsoleColor.Green;
				Console.WriteLine("DONE");
			}
			else {
				Console.ForegroundColor = ConsoleColor.Red;
				Console.WriteLine("FAILS");
			}
			Console.ForegroundColor = ConsoleColor.Black;
		}

		public static void Bench(string display, TestHandler handler)
		{
			DateTime start = DateTime.Now;
			if(NbThread == 1) {
				BenchThreadStart(handler);
			}
			else {
				List<Thread> threads = new List<Thread>();
				for(int i = 0; i < NbThread; i++) {
					Thread thread = new Thread(BenchThreadStart);
					threads.Add(thread);
					thread.Start(handler);
				}
				foreach(Thread thread in threads) {
					thread.Join();
				}
			}
			TimeSpan duration = DateTime.Now - start;
			Console.Write("Bench "+display+" ");
			int reqSecond = (int)Math.Round((NbRequest*NbThread)/duration.TotalSeconds);
			if(reqSecond < SlowRequestLevel)
				Console.ForegroundColor = ConsoleColor.Red;
			else
				Console.ForegroundColor = ConsoleColor.DarkBlue;
			Console.Write("{0}", reqSecond);
			Console.ForegroundColor = ConsoleColor.Black;
			Console.WriteLine(" req/s"); 
		}

		static void BenchThreadStart(object obj)
		{
			TestHandler handler = (TestHandler)obj;
			for(int i = 0; i < NbRequest; i++) {
				handler();
			}
		}

		public static void Main(string[] args)
		{
			Console.WriteLine("Start tests...");

			Display("StaticFilesService", TestStaticFilesService);
			Display("CreateUser", TestCreateUser);
			Display("DeleteUser", TestDeleteUser);

			//Bench("StaticFilesService", TestStaticFilesService);

			Console.WriteLine("Stop tests");
		}
	}
}
