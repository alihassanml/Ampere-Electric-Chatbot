import React, { useState, useRef, useEffect } from 'react';
import { Send, Home, MessageCircle, HelpCircle, X, Bot, User, ChevronRight, Clock, Star, Phone, Mail, Sparkles, Zap } from 'lucide-react';

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

  // Generate or retrieve user ID
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

  // Load saved messages on component mount
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

  // Save messages to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      sessionStorage.setItem(`chat_messages_${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId]);

  // Sample FAQ data
  const faqData = [
    {
      question: "What are your business hours?",
      answer: "We're available Monday-Friday 9AM-6PM EST. Our chatbot provides 24/7 support for common questions."
    },
    {
      question: "How can I track my order?",
      answer: "You can track your order using the tracking number sent to your email, or contact our support team with your order ID."
    },
    {
      question: "What's your return policy?",
      answer: "We offer 30-day returns on most items. Items must be in original condition with tags attached."
    },
    {
      question: "How do I contact customer service?",
      answer: "You can reach us through this chat, email at shane@ampereelectricnv.com, or call us at 17027209545."
    },
    {
      question: "Do you offer international shipping?",
      answer: "Yes, we ship internationally to most countries. Shipping costs and delivery times vary by location."
    }
  ];

  // Quick action buttons for home screen
  const quickActions = [
    { icon: MessageCircle, title: "Start a Chat", subtitle: "Get instant help from our AI assistant", action: () => setScreen('chat') },
    { icon: Phone, title: "Call Support", subtitle: "Speak with a human agent", action: () => window.open('tel:17027209545') },
    { icon: Mail, title: "Email Us", subtitle: "Send us a detailed message", action: () => window.open('mailto:shane@ampereelectricnv.com') },
    { icon: HelpCircle, title: "Browse FAQ", subtitle: "Find answers to common questions", action: () => setScreen('faq') }
  ];

  // Webhook integration - Replace with your actual webhook URL
  const WEBHOOK_URL = "https://auto.robogrowthpartners.com/webhook/ampere-electric";

  const handleBotResponse = async (userMessage: string) => {
    setBotBusy(true);
    setTypingMessage("Support agent is typing...");

    try {
      // Send message to webhook
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
      
      // Process the response - handle multiple replies split by "\\k"
      const replies = (data.reply || "").split("\\k").filter((part: string) => part.trim() !== "");

      // If no replies, use a default message
      if (replies.length === 0) {
        replies.push("Thank you for your message. How can I assist you today?");
      }

      // Send each reply with a delay to simulate natural conversation
      for (let i = 0; i < replies.length; i++) {
        if (i > 0) {
          // Add delay between multiple messages
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
        
        // Small delay before next message
        if (i < replies.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

    } catch (error) {
      console.error('Webhook error:', error);
      setTypingMessage(null);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: "I apologize, but I'm experiencing some technical difficulties. Please try again or contact our human support team at support@company.com or 1-800-123-4567.", 
        timestamp: new Date(),
        feedback: null
      }]);
    }

    setBotBusy(false);
    
    // Process message queue if there are pending messages
    setMessageQueue(prev => {
      const [nextMessage, ...rest] = prev;
      if (nextMessage) {
        setTimeout(() => {
          handleBotResponse(nextMessage);
        }, 2000); // Longer delay between queued messages
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

    // If bot is busy, add to queue
    if (botBusy) {
      setMessageQueue(prev => [...prev, message]);
    } else {
      await handleBotResponse(message);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setScreen('chat');
    // Add a small delay to allow screen transition
    setTimeout(() => {
      handleBotResponse(question);
    }, 300);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMessage]);

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 bottom-0 w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-sm xl:max-w-md  sm:mx-0 z-50 ">
      <div 
        className="bg-white  border border-gray-200 overflow-hidden"
        style={{ 
          height: 'min(85vh, 750px)', 
          maxHeight: '85vh',
          minHeight: '600px',
          borderRadius:"30px"
        }}
      >
        <div className="flex flex-col h-full">
          
          {/* Simple Animated Header with Conditional Styling */}
          <div className={`relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-500 to-blue-600  ${
            screen === 'home' ? 'pb-8 curved-rectangle' : ''
          }`} style={{ borderRadius: '30px 30px 0 0' }}>
            {/* Moving Background Animation */}
            <div className="absolute inset-0">
              {/* Moving Gradient Orbs */}
              <div className="absolute w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" 
                   style={{ 
                     top: '10%', 
                     left: '10%',
                     animation: 'float 6s ease-in-out infinite'
                   }}></div>
              <div className="absolute w-24 h-24 bg-white/15 rounded-full blur-xl animate-pulse" 
                   style={{ 
                     top: '60%', 
                     right: '15%',
                     animation: 'float 8s ease-in-out infinite reverse',
                     animationDelay: '2s'
                   }}></div>
              <div className="absolute w-20 h-20 bg-white/20 rounded-full blur-lg animate-pulse" 
                   style={{ 
                     bottom: '20%', 
                     left: '20%',
                     animation: 'float 7s ease-in-out infinite',
                     animationDelay: '4s'
                   }}></div>
              
              {/* Moving Light Rays */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-white/20 to-transparent rounded-full blur-3xl"
                   style={{ 
                     animation: 'slideRight 10s linear infinite'
                   }}></div>
              <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-white/15 to-transparent rounded-full blur-2xl"
                   style={{ 
                     animation: 'slideLeft 12s linear infinite',
                     animationDelay: '3s'
                   }}></div>
              
            </div>
            
            {/* Header Content */}
            <div className={`relative z-10 text-white   ${
              screen === 'home' ? 'p-6 pb-4 ' : 'p-5'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {/* Simple Bot Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-white/0   flex items-center justify-center  ">
                      <img src="logo.png" alt="" />
                    </div>
                    {/* <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-lg"></div> */}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-lg tracking-wide">Support Center</h3>
                    <div className="flex items-center space-x-2 text-sm opacity-90">
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-all duration-300 hover:scale-110"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Simple Dynamic Subtitle */}
              <div className="text-sm opacity-90">
                {screen === 'home' && "👋 How can we help you today?"}
                {screen === 'chat' && "💬 We typically reply within seconds"}
                {screen === 'faq' && "❓ Find quick answers to common questions"}
              </div>

              {/* Additional content for home screen */}
              {screen === 'home' && (
                <div className="mt-1 ms-3 ">
                  <p className="text-sm opacity-80 leading-relaxed">
                    Get instant support or browse our help resources below
                  </p>
                </div>
              )}
            </div>

            {/* Rounded bottom overlay for home screen */}
            {screen === 'home' && (
              <div className="absolute bottom-0 left-0 w-full">
                <div className="h-6 bg-gradient-to-b from-transparent to-white/10 rounded-b-3xl"></div>
              </div>
            )}
            
            {/* CSS Animations */}
            <style jsx>{`
              @keyframes float {
                0%, 100% { transform: translateY(0px) translateX(0px); }
                25% { transform: translateY(-20px) translateX(10px); }
                50% { transform: translateY(-10px) translateX(-15px); }
                75% { transform: translateY(-25px) translateX(5px); }
              }
              
              @keyframes slideRight {
                0% { transform: translateX(-100px) rotate(0deg); }
                50% { transform: translateX(50px) rotate(180deg); }
                100% { transform: translateX(-100px) rotate(360deg); }
              }
              
              @keyframes slideLeft {
                0% { transform: translateX(100px) rotate(0deg); }
                50% { transform: translateX(-50px) rotate(-180deg); }
                100% { transform: translateX(100px) rotate(-360deg); }
              }
              
              @keyframes moveDot {
                0% { opacity: 0.3; transform: translateY(0px) translateX(0px) scale(1); }
                25% { opacity: 0.8; transform: translateY(-30px) translateX(20px) scale(1.2); }
                50% { opacity: 0.6; transform: translateY(-15px) translateX(-25px) scale(0.8); }
                75% { opacity: 0.9; transform: translateY(-40px) translateX(15px) scale(1.1); }
                100% { opacity: 0.3; transform: translateY(0px) translateX(0px) scale(1); }
              }
            `}</style>
          </div>

          {/* Main Content - Fixed Height */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {screen === 'home' && (
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <div className="p-4 space-y-4">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                      How can we help?
                    </h4>
                    <p className="text-gray-600 text-sm">Choose an option below to get started</p>
                  </div>
                  
                  <div className="space-y-3">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={index}
                          onClick={action.action}
                          className="w-full p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-blue-50 rounded-xl border border-gray-200 hover:border-indigo-200 transition-all duration-300 text-left group hover:shadow-lg transform hover:-translate-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-blue-100 rounded-xl flex items-center justify-center group-hover:from-indigo-200 group-hover:to-blue-200 transition-all duration-300 group-hover:scale-110">
                                <Icon className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div>
                                <h5 className="font-semibold text-gray-800">{action.title}</h5>
                                <p className="text-sm text-gray-600">{action.subtitle}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-all duration-300 group-hover:translate-x-1" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="font-semibold text-amber-800">Business Hours</span>
                    </div>
                    <p className="text-sm text-amber-700">Monday - Friday: 9AM - 6PM EST</p>
                    <p className="text-sm text-amber-700">Weekend: Limited support available</p>
                  </div>
                </div>
              </div>
            )}

            {screen === 'chat' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent p-4 space-y-4">
                  
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
                        <div className={`flex items-end space-x-2 ${msg.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                            msg.type === 'user' 
                              ? 'bg-gradient-to-r from-indigo-500 to-blue-500' 
                              : 'bg-gradient-to-r from-gray-200 to-gray-300'
                          }`}>
                            {msg.type === 'user' ? (
                              <User className="w-4 h-4 text-white" />
                            ) : (
                              <Bot className="w-8 h-4 text-gray-600" />
                            )}
                          </div>
                          <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                            msg.type === 'user'
                              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-800 rounded-bl-md'
                          }`}>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                        <p className={`text-xs text-gray-500 mt-1 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {typingMessage && (
                    <div className="flex justify-start">
                      <div className="flex items-end space-x-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center shadow-lg">
                          <Bot className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white shadow-sm"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || botBusy}
                      className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {screen === 'faq' && (
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent p-4">
                <div className="space-y-3">
                  {faqData.map((faq, index) => (
                    <details key={index} className="group">
                      <summary className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-blue-50 rounded-xl cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md">
                        <h5 className="font-medium text-gray-800 text-sm pr-4">{faq.question}</h5>
                        <ChevronRight className="w-4 h-4 text-gray-500 group-open:rotate-90 transition-transform duration-300" />
                      </summary>
                      <div className="p-4 pt-2">
                        <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                        <button 
                          onClick={() => handleQuickQuestion(faq.question)}
                          className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-1 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Ask this question in chat →</span>
                        </button>
                      </div>
                    </details>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                  <h5 className="font-semibold text-gray-800 mb-2">Still need help?</h5>
                  <p className="text-sm text-gray-600 mb-3">Can't find what you're looking for? Our support team is here to help!</p>
                  <button 
                    onClick={() => setScreen('chat')}
                    className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Start a conversation
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="border-t border-gray-200 bg-white">
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
                        ? 'text-indigo-600 bg-gradient-to-r from-indigo-50 to-blue-50' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-all duration-300 ${
                      isActive ? 'text-indigo-600 scale-110' : 'text-gray-500'
                    }`} />
                    <span className={`text-xs font-medium transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-gray-500'
                    }`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"></div>
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