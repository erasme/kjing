// DeviceService.cs
// 
//  A device is a diffusion point for KJing's resources
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

/*
using System;
using System.IO;
using System.Text;
using System.Data;
using Mono.Data.Sqlite;
using System.Threading.Tasks;
using System.Collections.Generic;
using Erasme.Http;
using Erasme.Json;
using KJing.Directory;

namespace KJing.Device
{
	public class Device
	{
		public Device()
		{
		}
	}
	
	public class DeviceService
	{
		const string DEVICE_PROTOCOL_VERSION = "1.0";

		object instanceLock = new object();
		Dictionary<string,DeviceClient> clients = new Dictionary<string,DeviceClient>();
		Dictionary<string,WebSocketHandlerCollection<DeviceControlClient>> controls = new Dictionary<string,WebSocketHandlerCollection<DeviceControlClient>>();

		public static void JsonMerge(JsonValue dest, JsonValue diff)
		{
			foreach(string key in diff.Keys) {
				JsonValue value = diff[key];
				if(!dest.ContainsKey(key))
					dest[key] = value;
				else {
					if((dest[key] is JsonObject) && (value is JsonObject)) {
						JsonMerge(dest[key], value);
					}
					else {
						dest[key] = value;
					}
				}
			}
		}

		public class DeviceClient: WebSocketHandler
		{
			object instanceLock = new object();
			JsonValue values;

			public DeviceClient(DeviceService service, string id)
			{
				Service = service;
				Id = id;
				values = new JsonObject();
			}

			public DeviceService Service { get; private set; }

			public string Id { get; private set; }

			public JsonValue Values {
				get {
					string jsonString;
					lock(instanceLock) {
						jsonString = values.ToString();
					}
					return JsonValue.Parse(jsonString);
				}
			}

			public void UpdateValues(JsonValue diff)
			{
				lock(instanceLock) {
					JsonMerge(values, diff);
				}
			}

			public override void OnOpen()
			{
				// register the client in the currently connected users
				lock(Service.instanceLock) {
					Service.clients[Id] = this;
				}

				JsonValue json = new JsonObject();
				json["type"] = "connect";
				json["version"] = DEVICE_PROTOCOL_VERSION;
				JsonValue deviceJson = null;
				try {
					deviceJson = Service.DirectoryService.GetResource(Id, null, 0);
				}
				catch(WebException) {
				}
				json["device"] = deviceJson;
				Send(json.ToString());
			}

			public override void OnMessage(string message)
			{
				//Console.WriteLine("DeviceService.OnMessage(" + message + ")");
				JsonValue json = JsonValue.Parse(message);
				if(json.ContainsKey("type") && (json["type"] == "change") && json.ContainsKey("device")) {
					lock(instanceLock) {
						JsonMerge(values, json["device"]);
					}
					Service.NotifyDeviceChange(Id, json["device"]);
				}
			}

			public override void OnError()
			{
				Close();
			}

			public override void OnClose()
			{
				lock(Service.instanceLock) {
					if(Service.clients.ContainsKey(Id) && (Service.clients[Id] == this))
						Service.clients.Remove(Id);
				}
			}
		}

		public class DeviceControlClient: WebSocketHandler
		{
			public DeviceControlClient(DeviceService service, string id)
			{
				Service = service;
				Id = id;
			}

			public DeviceService Service { get; private set; }

			public string Id { get; private set; }

			public override void OnOpen()
			{
				// register the client in the controllers list
				lock(Service.instanceLock) {
					WebSocketHandlerCollection<DeviceControlClient> controlClients;
					if(Service.controls.ContainsKey(Id)) {
						controlClients = Service.controls[Id];
					}
					else {
						controlClients = new WebSocketHandlerCollection<DeviceControlClient>();
						Service.controls[Id] = controlClients;
					}
					controlClients.Add(this);
				}

				JsonValue json = new JsonObject();
				json["type"] = "connect";
				json["version"] = DEVICE_PROTOCOL_VERSION;
				json["device"] = Service.DirectoryService.GetResource(Id, null, 0);
				Send(json.ToString());
			}

			public override void OnMessage(string message)
			{
				JsonValue json = JsonValue.Parse(message);

				if(json["type"] == "change")
					Service.NotifyDeviceChange(Id, json["device"]);
			}

			public override void OnError()
			{
				Close();
			}

			public override void OnClose()
			{
				lock(Service.instanceLock) {
					if(Service.controls.ContainsKey(Id)) {
						WebSocketHandlerCollection<DeviceControlClient> controlClients;
						controlClients = Service.controls[Id];
						controlClients.Remove(this);
						// remove the control list if empty
						if(controlClients.Count == 0)
							Service.controls.Remove(Id);
					}
				}
			}
		}

		public DeviceService(DirectoryService directoryService)
		{
			DirectoryService = directoryService;
		}

		public DirectoryService DirectoryService { get; private set; }

		public bool GetIsConnected(string id)
		{
			bool res;
			lock(instanceLock) {
				res = clients.ContainsKey(id);
			}
			return res;
		}

		public void GetDynamicValues(string id, JsonValue json)
		{
			DeviceClient client = null;
			lock(instanceLock) {
				if(clients.ContainsKey(id))
					client = clients[id];
			}
			if(client != null) {
				JsonMerge(json, client.Values);
				json["connected"] = true;
			}
		}

		public void SetDynamicValues(string id, JsonValue json)
		{
			DeviceClient client = null;
			lock(instanceLock) {
				if(clients.ContainsKey(id))
					client = clients[id];
			}
			if(client != null) {
				client.UpdateValues(json);
			}
		}

		public void NotifyDeviceChange(string id, JsonValue data)
		{
			DeviceClient deviceClient = null;
			WebSocketHandlerCollection<DeviceControlClient> controlClients = null;

			lock(instanceLock) {
				if(clients.ContainsKey(id))
					deviceClient = clients[id];
				if(controls.ContainsKey(id))
					controlClients = controls[id];
			}
			if((deviceClient != null) || (controlClients != null)) {
				JsonValue jsonMessage = new JsonObject();
				jsonMessage["type"] = "change";
				jsonMessage["device"] = data;
				string jsonString = jsonMessage.ToString();

				if(deviceClient != null)
					deviceClient.Send(jsonString);
				if(controlClients != null)
					controlClients.Broadcast(jsonString);
			}
		}
	}
}

*/