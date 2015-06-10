using System;
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
		static int NbThread = 4;
		static int SlowRequestLevel = 50;
		static int ServerPort = 3333;
		static string ServerHost = "localhost";
		static string ServerDataTestDir = "../../data/";

		static string TestUserId = null;
		static string TestUserLogin = "testlogin";
		static string TestUserPassword = "testlogin1234";
		static string TestUserAuthorization;
		static string TestFolderId;
		static string TestFileId;

		public class BenchContext
		{
			public Thread Thread;
			public TestHandler Handler;
			public int NbRequest;
		}

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

		public static bool TestCreateFolder()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Headers["authorization"] = TestUserAuthorization;
				request.Method = "POST";
				request.Path = "/cloud/resource";
				JsonObject json = new JsonObject();
				json["type"] = "folder";
				json["name"] = "Test Folder";
				json["parent"] = TestUserId;
				request.Content = new JsonContent(json);
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200) && response.Headers["content-type"].StartsWith("application/json");
				if(done) {
					JsonValue res = response.ReadAsJson();
					TestFolderId = (string)res["id"];
				}
			}
			return done;
		}

		public static bool TestDeleteFolder()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "DELETE";
				request.Path = "/cloud/resource/"+TestFolderId;
				request.Headers["authorization"] = TestUserAuthorization;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200);
			}
			return done;
		}

		public static bool TestGetFolder()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "GET";
				request.Path = "/cloud/resource/"+TestFolderId;
				request.Headers["authorization"] = TestUserAuthorization;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200);
			}
			return done;
		}

		public static bool TestCreateFile()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Headers["authorization"] = TestUserAuthorization;
				request.Method = "POST";
				request.Path = "/cloud/file";
				JsonObject json = new JsonObject();
				json["type"] = "file";
				json["name"] = "test.jpg";
				json["mimetype"] = "image/jpeg";
				json["parent"] = TestFolderId;

				MultipartContent multipartContent = new MultipartContent();
				JsonContent jsonContent = new JsonContent(json);
				jsonContent.Headers["content-disposition"] = "form-data; name=\"define\"";
				multipartContent.Add(jsonContent);

				StreamContent streamContent = new StreamContent(File.Open(Path.Combine(ServerDataTestDir, "test.jpg"), FileMode.Open, FileAccess.Read));
				streamContent.Headers["content-type"] = "image/jpeg";
				streamContent.Headers["content-disposition"] = "form-data; name=\"file\"; filename=\"test.jpg\"";
				multipartContent.Add(streamContent);

				request.Content = multipartContent;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200) && response.Headers["content-type"].StartsWith("application/json");
				if(done) {
					JsonValue res = response.ReadAsJson();
					TestFileId = (string)res["id"];
				}
			}
			return done;
		}

		public static bool TestSearchResource()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Headers["authorization"] = TestUserAuthorization;
				request.Method = "GET";
				request.Path = "/cloud/resource?query=jpg&seenBy="+TestUserId;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200) && response.Headers["content-type"].StartsWith("application/json");
				if(done) {
					JsonValue res = response.ReadAsJson();
					done = res.Count > 0;
				}
			}
			return done;
		}

		public static bool TestDeleteFile()
		{
			bool done = false;
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "DELETE";
				request.Path = "/cloud/resource/"+TestFileId;
				request.Headers["authorization"] = TestUserAuthorization;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200);
			}
			return done;
		}


		public static bool TestPositionChange()
		{
			string parentId;
			string[] childrenIds = new string[5];

			// create a parent folder
			bool done = false;
			using(HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Headers["authorization"] = TestUserAuthorization;
				request.Method = "POST";
				request.Path = "/cloud/resource";
				JsonObject json = new JsonObject();
				json["type"] = "folder";
				json["name"] = "Test Folder";
				json["parent"] = TestUserId;
				request.Content = new JsonContent(json);
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200) && response.Headers["content-type"].StartsWith("application/json");
				if(!done)
					return false;
				JsonValue res = response.ReadAsJson();
				parentId = (string)res["id"];
			}

			// create 5 children
			for(int i = 0; i < childrenIds.Length; i++) {
				using(HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
					HttpClientRequest request = new HttpClientRequest();
					request.Headers["authorization"] = TestUserAuthorization;
					request.Method = "POST";
					request.Path = "/cloud/resource";
					JsonObject json = new JsonObject();
					json["type"] = "folder";
					json["name"] = "Child "+i;
					json["parent"] = parentId;
					request.Content = new JsonContent(json);
					client.SendRequest(request);
					HttpClientResponse response = client.GetResponse();
					done = (response.StatusCode == 200) && response.Headers["content-type"].StartsWith("application/json");
					if(!done)
						return false;
					JsonValue res = response.ReadAsJson();
					childrenIds[i] = (string)res["id"];
				}
			}

			// move child 0 to position 1
			using(HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Headers["authorization"] = TestUserAuthorization;
				request.Method = "PUT";
				request.Path = "/cloud/resource/"+childrenIds[0];
				JsonObject json = new JsonObject();
				json["position"] = 1;
				request.Content = new JsonContent(json);
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200) && response.Headers["content-type"].StartsWith("application/json");
				if(!done)
					return false;
			}
			// check if the child position change to 1
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "GET";
				request.Path = "/cloud/resource/"+childrenIds[0];
				request.Headers["authorization"] = TestUserAuthorization;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200);
				if(!done)
					return false;
				JsonValue res = response.ReadAsJson();
				if((long)res["position"] != 1)
					return false;
			}
			// check if the child is at position 1 in the parent folder
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "GET";
				request.Path = "/cloud/resource/"+parentId;
				request.Headers["authorization"] = TestUserAuthorization;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200);
				if(!done)
					return false;
				JsonValue res = response.ReadAsJson();
				JsonArray children = (JsonArray)res["children"];
				if((string)children[1] != childrenIds[0])
					return false;
			}

			// delete the parent folder
			using (HttpClient client = HttpClient.Create(ServerHost, ServerPort)) {
				HttpClientRequest request = new HttpClientRequest();
				request.Method = "DELETE";
				request.Path = "/cloud/resource/"+parentId;
				request.Headers["authorization"] = TestUserAuthorization;
				client.SendRequest(request);
				HttpClientResponse response = client.GetResponse();
				done = (response.StatusCode == 200);
				if(!done)
					return false;
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

		public static void Bench(string display, TestHandler handler, int count = 1000)
		{
			DateTime start = DateTime.Now;
			if(NbThread == 1) {
				BenchThreadStart(handler);
			}
			else {
				List<BenchContext> contexts = new List<BenchContext>();
				for(int i = 0; i < NbThread; i++) {
					BenchContext context = new BenchContext();
					context.NbRequest = count;
					context.Handler = handler;
					context.Thread = new Thread(BenchThreadStart);
					contexts.Add(context);
					context.Thread.Start(context);
				}
				foreach(BenchContext context in contexts) {
					context.Thread.Join();
				}
			}
			TimeSpan duration = DateTime.Now - start;
			Console.Write("Bench "+display+" ");
			int reqSecond = (int)Math.Round((count*NbThread)/duration.TotalSeconds);
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
			BenchContext context = (BenchContext)obj;
			for(int i = 0; i < context.NbRequest; i++) {
				context.Handler();
			}
		}

		public static TestHandler TestGroup(params TestHandler[] handlers)
		{
			return new TestHandler(delegate() {
				foreach(TestHandler handler in handlers) {
					if(!handler())
						return false;
				}
				return true;
			});
		}

		public static void Main(string[] args)
		{
			Console.WriteLine("Start tests...");

			Display("StaticFilesService", TestStaticFilesService);
			Display("CreateUser", TestCreateUser);
			Display("CreateFolder", TestCreateFolder);
			Display("GetFolder", TestGetFolder);
			Bench("GetFolder", TestGetFolder, 100);
			Display("CreateFile", TestCreateFile);
			Display("SearchResource", TestSearchResource);
			Display("DeleteFile", TestDeleteFile);
			Display("DeleteFolder", TestDeleteFolder);

			Display("TestPositionChange", TestPositionChange);

			//Display("Create/Delete Folder", TestGroup(TestCreateFolder, TestDeleteFolder));
			//Bench("Create/Delete Folder", TestGroup(TestCreateFolder, TestDeleteFolder), 100);

			Display("DeleteUser", TestDeleteUser);

			//Bench("StaticFilesService", TestStaticFilesService);

			Console.WriteLine("Stop tests");
		}
	}
}
