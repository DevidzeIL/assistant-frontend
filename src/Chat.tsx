import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dark } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./App.css";

const Chat: React.FC = () => {
  const [question, setQuestion] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [chatHistory, setChatHistory] = useState<
    Array<{ type: string; message: string }>
  >([]);
  const chatEndRef = useRef<null | HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const formatJsonFromString = (inputString: string) => {
    const jsonPattern = /```json([\s\S]*?)```/;
    const match = inputString.match(jsonPattern);
    if (match && match[1]) {
      try {
        const json = JSON.parse(match[1]);
        return JSON.stringify(json, null, 2);
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        return inputString;
      }
    }
    return inputString;
  };

  const handleQuestionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(event.target.value);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files ? event.target.files[0] : null;
    setFile(file);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData();
    if (question.trim()) {
      formData.append("question", question);
    }
    if (file) {
      formData.append("image", file);
      formData.append("document", file); // Changed from "image" to "document" if that's what the backend expects
      formData.append("filename", file.name);

      formData.append("filename", file.name); // Adding filename just for reference
    } else {
      console.error("No file selected.");
      setIsLoading(false);
      return; // Prevent form submission if no file is selected
    }

    setQuestion("");
    setFile(null);

    const message = question || (file ? file.name : "");
    setChatHistory((prev) => [...prev, { type: "user", message: message }]);

    try {
      const [askResponse, imageDataResponse] = await Promise.all([
        axios.post("http://81.94.159.202:5000/ask", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 100000,
        }),
        axios.post("http://81.94.159.202/get_image_data/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 100000,
        }),
      ]);

      const askFormatted = formatJsonFromString(askResponse.data.response);
      const imageDataFormatted = JSON.stringify(
        imageDataResponse.data.data.predictions[0],
        null,
        2
      );
      const imageVoteDataFormatted = JSON.stringify(
        imageDataResponse.data.results,
        null,
        2
      );

      setChatHistory((prev) => [
        ...prev,
        {
          type: "ai",
          message: `Heavy KB Model:\n${askFormatted}\n\nLight KB Model:\n${imageDataFormatted}\n"results": ${imageVoteDataFormatted}`,
        },
      ]);
    } catch (error) {
      console.error("Error fetching responses:", error);
      setChatHistory((prev) => [
        ...prev,
        { type: "ai", message: "Failed to fetch responses." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div
        className="chat-history"
        style={{
          overflowY: "auto",
          marginTop: "10px",
        }}
      >
        {chatHistory.map((entry, index) => (
          <div
            key={index}
            style={{ textAlign: entry.type === "user" ? "right" : "left" }}
          >
            <div
              style={{
                display: "inline-block",
                maxWidth: "80%",
                padding: "5px",
                borderRadius: "5px",
                backgroundColor: entry.type === "user" ? "#2F2F2F" : "#212121",
                margin: "5px",
                fontSize: "16px",
              }}
            >
              {entry.type === "ai" ? (
                <SyntaxHighlighter language="json" style={dark}>
                  {entry.message}
                </SyntaxHighlighter>
              ) : (
                entry.message
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {isLoading && <div>Loading...</div>}
      <form onSubmit={handleSubmit} className="chat-form">
        {/* <input
          type="text"
          value={question}
          onChange={handleQuestionChange}
          placeholder="Ask a question..."
        /> */}
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/png, image/jpeg"
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default Chat;
