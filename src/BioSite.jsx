// BioSiteWithFirebase.js
import React, { useState, useEffect, useRef } from "react";
import emailjs from "emailjs-com";
import { motion } from "framer-motion";
import { db } from "./firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  getDocs
} from "firebase/firestore";

const pinnedCommands = ["hello", "experience", "skills", "chat"];

function PinnedCommands({ setCommand, inputRef }) {
  return (
    <div className="mt-10 border border-green-700 p-4 rounded-xl bg-green-900/10 backdrop-blur-md">
      <p className="text-green-300 text-xl mb-3 font-bold underline">Pinned Commands</p>
      <div className="flex flex-wrap gap-4">
        {pinnedCommands.map((cmd) => (
          <button
            key={cmd}
            onClick={() => {
              setCommand(cmd);
              inputRef.current?.focus();
            }}
            className="px-4 py-2 bg-green-500 text-black font-semibold rounded-2xl shadow-md hover:bg-green-400 hover:scale-105 transition-all duration-200"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}

const AnimatedLine = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!text) return;
    let i = 0;
    const stripped = text.replace(/<[^>]+>/g, "");
    const chars = [...stripped];
    const interval = setInterval(() => {
      if (i < chars.length) {
        setDisplayedText((prev) => prev + chars[i]);
        i++;
      } else {
        clearInterval(interval);
        if (onComplete && typeof text === "string") {
          setTimeout(() => onComplete(text + ""), 0);
        }
      }
    }, 15);
    return () => clearInterval(interval);
  }, [text]);

  const isHtml = /<[^>]+>/.test(text);
  return isHtml ? (
    <pre dangerouslySetInnerHTML={{ __html: text }} />
  ) : (
    <pre className="whitespace-pre-wrap break-words">{displayedText}<span className="animate-pulse">█</span></pre>
  );
};

export default function BioSite() {
  const [showAdmin, setShowAdmin] = useState(() => window.innerWidth >= 640);
  const [command, setCommand] = useState("");
  const [staticOutput, setStaticOutput] = useState(["Abdallah Elabd 💚", "Twitter: @abdallahelabd05"]);
  const [animatedOutput, setAnimatedOutput] = useState([]);
  const [queuedLines, setQueuedLines] = useState([]);
  const [chatMode, setChatMode] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [userName, setUserName] = useState(() => {
    const stored = localStorage.getItem("userName");
    if (stored) return stored;
    const generated = "User" + Math.floor(Math.random() * 1000);
    localStorage.setItem("userName", generated);
    return generated;
  });
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("isAdmin") === "true");
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "chatMessages"), orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatLog(messages);

      // Mark unseen messages as seen (admin only)
      if (isAdmin) {
        for (const msg of messages) {
          if (!msg.seen && msg.userName !== "Abdallah") {
            await updateDoc(doc(db, "chatMessages", msg.id), { seen: true });
          }
        }
      }

      const restored = messages.map((log) => {
        const isAdminLog = log.userName === "Abdallah";
        const userLine = isAdminLog
          ? `<span class='text-yellow-400'>🫅 Abdallah</span>: ${log.user} (${log.time}) <span class='text-blue-400'>✓</span> <span class='text-blue-400 transition-opacity duration-300 animate-pingOnce'>✓</span>`
          : log.userName === userName && !isAdmin
            ? `👤 You: ${log.user} (${log.time}) <span class='text-blue-400'>✓</span>${log.seen ? " <span class='text-blue-400 transition-opacity duration-300 animate-pingOnce'>✓</span>" : ""}`
            : `👤 ${log.userName}: ${log.user} (${log.time})`;

        const replyLines = (log.replies || []).map(reply => reply);
        return [userLine, ...replyLines];
      }).flat();

      setStaticOutput(["Abdallah Elabd 💚", "Twitter: @abdallahelabd05", ...restored]);
    });

    return () => unsubscribe();
  }, [isAdmin, userName]);

  useEffect(() => {
    if (queuedLines.length > 0 && animatedOutput.length === 0) {
      const [next, ...rest] = queuedLines;
      setAnimatedOutput([next]);
      setQueuedLines(rest);
    }
  }, [queuedLines, animatedOutput]);

  const handleCommand = async () => {
    const trimmed = command.trim();
    if (!trimmed) return;

    const [baseCmd, ...args] = trimmed.split(" ");

    if (chatMode && trimmed !== "exit") {
      if (!isAdmin) {
        const time = new Date().toLocaleTimeString();
        await addDoc(collection(db, "chatMessages"), {
          user: trimmed,
          userName,
          time,
          replies: [],
          seen: false,
          timestamp: new Date()
        });
        setCommand("");
        return;
      } else {
        setStaticOutput((prev) => [...prev, "❌ Admins must reply using the panel."]);
        setCommand("");
        return;
      }
    }

    if (chatMode && trimmed === "exit") {
      setChatMode(false);
      setStaticOutput((prev) => [...prev, `$ ${trimmed}`, "Exited chat mode."]);
      setCommand("");
      return;
    }

    let result = [];
    switch (baseCmd) {
      case "clear":
        if (isAdmin) {
          const querySnapshot = await getDocs(collection(db, "chatMessages"));
          querySnapshot.forEach(async (docSnap) => {
            await deleteDoc(doc(db, "chatMessages", docSnap.id));
          });
          setStaticOutput((prev) => [...prev, `$ ${command}`, "🧹 Chat history cleared from Firestore."]);
        } else {
          setStaticOutput((prev) => [...prev, `$ ${command}`, "❌ Only admins can clear chat."]);
        }
        setCommand("");
        return;
      case "admin":
        if (args[0] === "1234") {
          setIsAdmin(true);
          localStorage.setItem("isAdmin", "true");
          setStaticOutput((prev) => [...prev, `$ ${command}`, "✅ Admin access granted."]);
        } else {
          setStaticOutput((prev) => [...prev, `$ ${command}`, "❌ Incorrect passcode."]);
        }
        setCommand("");
        return;
      case "logout":
        setIsAdmin(false);
        localStorage.removeItem("isAdmin");
        setStaticOutput((prev) => [...prev, `$ ${command}`, "🚪 Logged out of admin mode."]);
        setCommand("");
        return;
      case "chat":
        setChatMode(true);
        setStaticOutput((prev) => [...prev, `$ ${trimmed}`, "Chat mode activated! Type your message."]);
        setCommand("");
        return;
      case "hello":
        result = ["Hello, Welcome to my humble site! 👋"];
        break;
      case "experience":
        result = [
          "→ Worked as a freelancing programmer since 2020.",
          "→ Launched more than 5 startups in 3 different fields.",
          "→ Gained many experiences in fields like designing, blockchain and marketing."
        ];
        break;
      case "skills":
        result = [
          "🧠 Programming:",
          "• Python • C++ • HTML • JS • CSS • Solidity",
          "🎨 Designing:",
          "• Photoshop • Illustrator • Figma • Adobe Premiere",
          "📣 Marketing:",
          "• Facebook • Twitter • Google Ads"
        ];
        break;
      default:
        result = [`Command not found: ${trimmed}`];
    }

    setStaticOutput((prev) => [...prev, `$ ${trimmed}`]);
    setQueuedLines(result);
    setCommand("");
  };

  return (
    <main className="min-h-screen bg-black text-green-400 px-4 sm:px-6 py-16 font-mono relative overflow-hidden">
      <section className="max-w-6xl mx-auto text-base sm:text-lg md:text-xl relative z-10 px-2">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          <div className="space-y-3">
            {staticOutput.map((line, idx) => (
              <pre key={`static-${idx}`} className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: line }} />
            ))}
            {animatedOutput.map((line, idx) => (
              <AnimatedLine
                key={`animated-${idx}`}
                text={line}
                onComplete={(line) => {
                  setStaticOutput((prev) => [...prev, line]);
                  setAnimatedOutput([]);
                }}
              />
            ))}
            <div ref={outputRef} />
          </div>

          <div className="mt-6 flex items-center gap-2">
            <span className="text-green-500">$</span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCommand()}
              className="bg-transparent outline-none text-green-400 placeholder-green-600 w-full pr-4"
              placeholder="type a command..."
              autoFocus
            />
          </div>

          <PinnedCommands setCommand={setCommand} inputRef={inputRef} />
        </motion.div>
      </section>
    </main>
  );
}
