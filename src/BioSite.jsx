// Main BioSite component using Firebase integration
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import emailjs from "emailjs-com";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
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
  const [command, setCommand] = useState("");
  const [staticOutput, setStaticOutput] = useState(["Abdallah Elabd 💚", "Twitter: @abdallahelabd05"]);
  const [animatedOutput, setAnimatedOutput] = useState([]);
  const [queuedLines, setQueuedLines] = useState([]);
  const [chatLog, setChatLog] = useState([]);
  const [chatMode, setChatMode] = useState(false);
  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const [userName, setUserName] = useState(() => {
    const stored = localStorage.getItem("userName");
    if (stored) return stored;
    const generated = "User" + Math.floor(Math.random() * 1000);
    localStorage.setItem("userName", generated);
    return generated;
  });

  useEffect(() => {
    outputRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [staticOutput, animatedOutput]);

  useEffect(() => {
    if (!db) return;
    const chatRef = collection(db, "messages");
    const q = query(chatRef, orderBy("timestamp", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedChat = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setChatLog(updatedChat);
      const restored = updatedChat.map((log) => {
        const isAdminLog = log.userName === "Abdallah";
        const label = isAdminLog
          ? `<span class='text-yellow-400'>🫅 Abdallah</span>: ${log.user} (${log.time})`
          : `👤 ${log.userName}: ${log.user} (${log.time})`;
        return label;
      });
      setStaticOutput(["Abdallah Elabd 💚", "Twitter: @abdallahelabd05", ...restored]);
    });
    return () => unsubscribe();
  }, [userName]);

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
    const [baseCmd] = trimmed.split(" ");

    if (chatMode && trimmed !== "exit") {
      const time = new Date().toLocaleTimeString();
      await addDoc(collection(db, "messages"), {
        user: trimmed,
        userName,
        time,
        timestamp: serverTimestamp()
      });
      setCommand("");
      return;
    }

    if (chatMode && trimmed === "exit") {
      setChatMode(false);
      setStaticOutput((prev) => [...prev, "$ exit", "Exited chat mode."]);
      setCommand("");
      return;
    }

    let result = [];
    switch (baseCmd) {
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
      case "chat":
        setChatMode(true);
        setStaticOutput((prev) => [...prev, "$ chat", "Chat mode activated! Type your message."]);
        setCommand("");
        return;
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
