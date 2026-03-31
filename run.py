import subprocess
import time

# start python server
subprocess.Popen(["python", "hi.py"])

# wait for server to boot
time.sleep(3)

# start ngrok
subprocess.run(["./ngrok", "http", "5000"])
#or this command 
#python hi.py & sleep 3 && ./ngrok http 5000