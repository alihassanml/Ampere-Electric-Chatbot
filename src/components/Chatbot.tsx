import React, { useState, useRef, useEffect } from 'react';
import { Send, Home, MessageCircle, HelpCircle, X, Bot, User, ChevronRight, Phone, Mail, Zap } from 'lucide-react';

type Message = {
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
  feedback?: string | null;
};

type Screen = 'home' | 'chat' | 'faq';

const CustomerSupportChatbot = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [screen, setScreen] = useState<Screen>('home');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingMessage, setTypingMessage] = useState<string | null>(null);
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [botBusy, setBotBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      const existing = sessionStorage.getItem("support_user_id");
      if (existing) return existing;
      const random = `user_${Math.random().toString(36).substring(2, 10)}`;
      sessionStorage.setItem("support_user_id", random);
      return random;
    }
    return `user_${Math.random().toString(36).substring(2, 10)}`;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = sessionStorage.getItem(`chat_messages_${userId}`);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        } catch (error) {
          console.error('Error loading saved messages:', error);
        }
      }
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      sessionStorage.setItem(`chat_messages_${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  const faqData = [
    {
      question: "What are your business hours?",
      answer: "We're available Monday-Friday 9AM-6PM EST. Our chatbot provides 24/7 support for common questions."
    },
    {
      question: "How can I schedule an electrical service?",
      answer: "You can schedule service by calling us at +1 (702) 979-1747, emailing shane@ampereelectricnv.com, or visit our booking page at ampereelectricnv.com/book-service/"
    },
    {
      question: "Do you offer emergency electrical services?",
      answer: "Yes! We provide emergency electrical services in the Las Vegas area. Contact us immediately at +1 (702) 979-1747 for urgent electrical issues."
    },
    {
      question: "What areas do you serve?",
      answer: "We proudly serve Las Vegas, Paradise, and surrounding areas in Nevada with professional electrical services."
    },
    {
      question: "Are you licensed and insured?",
      answer: "Yes, Ampere Electric is fully licensed and insured. We're a third-generation electrical company with over 35 years of experience since 1987."
    }
  ];

  const quickActions = [
    { 
      icon: MessageCircle, 
      title: "Start a Chat", 
      subtitle: "Get instant help from our team", 
      action: () => setScreen('chat'),
      gradient: "from-amber-500 to-yellow-500"
    },
    { 
      icon: Phone, 
      title: "Call Us Now", 
      subtitle: "+1 (702) 979-1747", 
      action: () => window.open('tel:+17029791747'),
      gradient: "from-blue-600 to-cyan-600"
    },
    { 
      icon: Mail, 
      title: "Email Support", 
      subtitle: "shane@ampereelectricnv.com", 
      action: () => window.open('mailto:shane@ampereelectricnv.com'),
      gradient: "from-slate-600 to-slate-700"
    },
    { 
      icon: HelpCircle, 
      title: "Browse FAQ", 
      subtitle: "Common questions answered", 
      action: () => setScreen('faq'),
      gradient: "from-orange-500 to-amber-600"
    }
  ];

  const WEBHOOK_URL = "https://auto.robogrowthpartners.com/webhook/ampere-electric";

  const handleBotResponse = async (userMessage: string) => {
    setBotBusy(true);
    setTypingMessage("Support agent is typing...");

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ 
          user_id: userId, 
          message: userMessage 
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const replies = (data.reply || "").split("\\k").filter((part: string) => part.trim() !== "");

      if (replies.length === 0) {
        replies.push("Thank you for contacting Ampere Electric. How can we help you today?");
      }

      for (let i = 0; i < replies.length; i++) {
        if (i > 0) {
          setTypingMessage("Support agent is typing...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        setTypingMessage(null);
        setMessages(prev => [...prev, { 
          type: 'bot', 
          text: replies[i].trim(), 
          timestamp: new Date(),
          feedback: null
        }]);
        
        if (i < replies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

    } catch (error) {
      console.error('Webhook error:', error);
      setTypingMessage(null);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: "I apologize for the inconvenience. Please contact us directly at +1 (702) 979-1747 or shane@ampereelectricnv.com for immediate assistance.", 
        timestamp: new Date(),
        feedback: null
      }]);
    }

    setBotBusy(false);
    
    setMessageQueue(prev => {
      const [nextMessage, ...rest] = prev;
      if (nextMessage) {
        setTimeout(() => {
          handleBotResponse(nextMessage);
        }, 2000);
      }
      return rest;
    });
  };

  const sendMessage = async () => {
    if (input.trim() === '') return;
    
    const message = input.trim();
    setInput('');
    setMessages(prev => [...prev, { 
      type: 'user', 
      text: message, 
      timestamp: new Date(),
      feedback: null
    }]);

    if (botBusy) {
      setMessageQueue(prev => [...prev, message]);
    } else {
      await handleBotResponse(message);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setScreen('chat');
    setTimeout(() => {
      handleBotResponse(question);
    }, 300);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMessage]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 bottom-0 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-sm xl:max-w-md sm:mx-0 z-50">
      <div 
        className="bg-white border border-gray-200 overflow-hidden shadow-2xl"
        style={{ 
          height: 'min(85vh, 750px)', 
          maxHeight: '85vh',
          minHeight: '600px',
          borderRadius: "24px"
        }}
      >
        <div className="flex flex-col h-full">
          
          {/* Enhanced Professional Header */}
          <div className={`relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 ${
            screen === 'home' ? 'pb-8' : ''
          }`} style={{ borderRadius: '24px 24px 0 0' }}>
            
            {/* Animated Electric Energy Background */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute w-40 h-40 bg-amber-400 rounded-full blur-3xl animate-pulse" 
                   style={{ 
                     top: '20%', 
                     right: '10%',
                     animation: 'energyPulse 4s ease-in-out infinite'
                   }}></div>
              <div className="absolute w-32 h-32 bg-yellow-400 rounded-full blur-2xl animate-pulse" 
                   style={{ 
                     bottom: '10%', 
                     left: '15%',
                     animation: 'energyPulse 5s ease-in-out infinite',
                     animationDelay: '1s'
                   }}></div>
              <div className="absolute w-24 h-24 bg-orange-500 rounded-full blur-xl animate-pulse" 
                   style={{ 
                     top: '50%', 
                     left: '50%',
                     animation: 'energyPulse 3s ease-in-out infinite',
                     animationDelay: '2s'
                   }}></div>
            </div>

            {/* Electric Lines Effect */}
            <div className="absolute inset-0">
              <svg className="w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="electric" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#fbbf24', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: '#f59e0b', stopOpacity: 0}} />
                  </linearGradient>
                </defs>
                <path d="M0,50 Q25,30 50,50 T100,50" stroke="url(#electric)" strokeWidth="2" fill="none" className="animate-pulse" />
                <path d="M0,70 Q25,90 50,70 T100,70" stroke="url(#electric)" strokeWidth="2" fill="none" className="animate-pulse" style={{animationDelay: '0.5s'}} />
              </svg>
            </div>
            
            {/* Header Content */}
            <div className={`relative z-10 text-white ${
              screen === 'home' ? 'p-6 pb-4' : 'p-5'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg border-2 border-amber-300/30">
                      <Zap className="w-7 h-7 text-white" fill="white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-800 animate-pulse"></div>
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-xl tracking-wide">Ampere Electric</h3>
                    <div className="flex items-center space-x-2 text-sm opacity-90">
                      <span className="text-amber-300">⚡ Online Now</span>
                    </div>
                  </div>
                </div>
                
                {/* <button 
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90"
                >
                  <X className="w-5 h-5" />
                </button> */}
              </div>
              
              <div className="text-sm opacity-90 text-amber-100">
                {screen === 'home' && "👋 Expert Electrical Services in Las Vegas"}
                {screen === 'chat' && "💬 We typically respond within seconds"}
                {screen === 'faq' && "❓ Quick answers to common questions"}
              </div>

              {screen === 'home' && (
                <div className="mt-3">
                  <p className="text-sm opacity-80 leading-relaxed text-gray-200">
                    Third-generation electricians since 1987 • Licensed & Insured
                  </p>
                </div>
              )}
            </div>

            <style jsx>{`
              @keyframes energyPulse {
                0%, 100% { 
                  transform: scale(1) translateY(0px); 
                  opacity: 0.3;
                }
                50% { 
                  transform: scale(1.2) translateY(-10px); 
                  opacity: 0.6;
                }
              }
            `}</style>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {screen === 'home' && (
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="p-5 space-y-4">
                  <div className="text-center mb-4">
                    <h4 className="text-2xl font-bold text-slate-800 mb-2">
                      How Can We Help?
                    </h4>
                    <p className="text-gray-600 text-sm">Professional electrical services at your fingertips</p>
                  </div>
                  
                  <div className="space-y-3">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={index}
                          onClick={action.action}
                          className="w-full p-4 bg-white hover:bg-gray-50 rounded-2xl border-2 border-gray-200 hover:border-amber-300 transition-all duration-300 text-left group hover:shadow-xl transform hover:-translate-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 bg-gradient-to-br ${action.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-800 text-base">{action.title}</h5>
                                <p className="text-sm text-gray-600 mt-0.5">{action.subtitle}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-all duration-300 group-hover:translate-x-1" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200">
                    <div className="flex items-start space-x-3">
                      <Zap className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h5 className="font-bold text-slate-800 text-sm mb-1">Emergency Service Available</h5>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          Electrical emergencies? We're here to help 24/7. Call us immediately at +1 (702) 979-1747
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {screen === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent p-4 space-y-4 bg-gray-50">
                  
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                        <div className={`flex items-end space-x-2 ${msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 ${
                            msg.type === 'user' 
                              ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                              : 'bg-gradient-to-br from-amber-400 to-orange-500'
                          }`}>
                            {msg.type === 'user' ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Zap className="w-4 h-4 text-white" fill="white" />
                            )}
                          </div>
                          <div className={`px-4 py-3 rounded-2xl shadow-md ${
                            msg.type === 'user'
                              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-sm'
                              : 'bg-white text-slate-800 rounded-bl-sm border border-gray-200'
                          }`}>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                        <p className={`text-xs text-gray-500 mt-1 px-10 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {typingMessage && (
                    <div className="flex justify-start">
                      <div className="flex items-end space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                          <Zap className="w-4 h-4 text-white" fill="white" />
                        </div>
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-md border border-gray-200">
                          <div className="flex space-x-1.5">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Enhanced Chat Input */}
                <div className="p-4 border-t-2 border-gray-200 bg-white">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3.5 border-2 border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-gray-50 shadow-sm text-sm"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || botBusy}
                      className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {screen === 'faq' && (
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent p-4 bg-gray-50">
                <div className="space-y-3">
                  {faqData.map((faq, index) => (
                    <details key={index} className="group">
                      <summary className="flex items-center justify-between p-4 bg-white hover:bg-amber-50 rounded-xl cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200 hover:border-amber-300">
                        <h5 className="font-semibold text-slate-800 text-sm pr-4">{faq.question}</h5>
                        <ChevronRight className="w-4 h-4 text-gray-500 group-open:rotate-90 transition-transform duration-300 flex-shrink-0" />
                      </summary>
                      <div className="p-4 pt-3 bg-white border-x border-b border-gray-200 rounded-b-xl mt-0.5">
                        <p className="text-sm text-gray-700 leading-relaxed">{faq.answer}</p>
                        <button 
                          onClick={() => handleQuickQuestion(faq.question)}
                          className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center space-x-1 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Ask this in chat →</span>
                        </button>
                      </div>
                    </details>
                  ))}
                </div>
                
                <div className="mt-6 p-5 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl border-2 border-slate-600 shadow-xl">
                  <div className="flex items-start space-x-3 mb-3">
                    <Zap className="w-6 h-6 text-amber-400 flex-shrink-0" fill="currentColor" />
                    <div>
                      <h5 className="font-bold text-white mb-1">Need More Help?</h5>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        Can't find what you're looking for? Our experienced electricians are ready to assist you!
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setScreen('chat')}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-3.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Start a Conversation
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Footer Navigation */}
          <div className="border-t-2 border-gray-200 bg-white">
            <div className="flex">
              {[
                { icon: Home, label: 'Home', screen: 'home' as Screen },
                { icon: MessageCircle, label: 'Chat', screen: 'chat' as Screen },
                { icon: HelpCircle, label: 'FAQ', screen: 'faq' as Screen }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = screen === item.screen;
                
                return (
                  <button
                    key={item.screen}
                    onClick={() => setScreen(item.screen)}
                    className={`flex-1 p-4 flex flex-col items-center space-y-1 transition-all duration-300 relative ${
                      isActive 
                        ? 'text-amber-600 bg-amber-50' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-all duration-300 ${
                      isActive ? 'text-amber-600 scale-110' : 'text-gray-500'
                    }`} />
                    <span className={`text-xs font-semibold transition-colors ${
                      isActive ? 'text-amber-600' : 'text-gray-500'
                    }`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSupportChatbot;