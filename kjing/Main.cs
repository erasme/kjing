// MainClass.cs
// 
//  Entry point of KJing
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
using System.IO;
using System.Xml.Serialization;
using Mono.Unix;
using Mono.Unix.Native;
using Erasme.Http;

namespace KJing
{
	class MainClass
	{
		public static void Main(string[] args)
		{
			// get the config file from args
			string configFile = null;
			for(int i = 0; i < args.Length; i++) {
				if((args[i] == "-c") || (args[i] == "--configFile"))
					configFile = args[++i];
			}

			Setup setup;
			Server server;

			// load the config file
			if(configFile != null) {
				using(FileStream stream = File.OpenRead(configFile)) {
					XmlSerializer serializer = new XmlSerializer(typeof(Setup));
					setup = (Setup)serializer.Deserialize(stream);
				}
				Console.WriteLine("Setup loaded from '"+configFile+"'");
			}
			else {
				setup = new Setup();
				Console.WriteLine("Default setup loaded");
			}

			// clean/create temporary dir
			if(System.IO.Directory.Exists(setup.TemporaryDirectory))
				System.IO.Directory.Delete(setup.TemporaryDirectory, true);
			System.IO.Directory.CreateDirectory(setup.TemporaryDirectory);

			server = new Server(setup);
			if(setup.Debug)
				server.StopOnException = true;
			server.Start();

			// catch signals for service stop
			UnixSignal[] signals = new UnixSignal [] {
				new UnixSignal(Mono.Unix.Native.Signum.SIGINT),
				new UnixSignal(Mono.Unix.Native.Signum.SIGTERM),
				new UnixSignal(Mono.Unix.Native.Signum.SIGUSR2),
			};
				
			Signum signal;
			bool run = true;
				
			do {
				int index = UnixSignal.WaitAny(signals, -1);
				signal = signals[index].Signum;

				if(signal == Signum.SIGINT)
					run = false;
				else if(signal == Signum.SIGTERM)
					run = false;
				else if(signal == Signum.SIGUSR2)
					run = false;
			} while(run);

			server.Stop();

			Console.WriteLine("Server stop");
		}
	}
}
