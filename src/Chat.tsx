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
    const jsonPattern = /```json([\s\S]*?)```/; // Регулярное выражение для извлечения текста между ```json и ```
    const match = inputString.match(jsonPattern);
    if (match && match[1]) {
      try {
        const json = JSON.parse(match[1]); // Преобразуем строку в JSON
        return JSON.stringify(json, null, 2); // Форматируем JSON с отступом в 2 пробела
      } catch (error) {
        console.error("Failed to parse JSON:", error);
        return inputString; // Возвращаем исходный текст, если JSON не найден
      }
    }
    return inputString; // Возвращаем исходный текст, если JSON не найден
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
      formData.append("filename", file.name); // Добавляем название файла
    }
    setQuestion("");
    setFile(null);

    if (formData.has("question") || formData.has("image")) {
      const message = question || (file ? file.name : "");
      setChatHistory((prev) => [...prev, { type: "user", message: message }]);
      try {
        const response = await axios.post(
          "http://localhost:5000/ask",
          formData,
          {
            timeout: 100000,
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
        const formattedResponse = formatJsonFromString(response.data.response);
        setChatHistory((prev) => [
          ...prev,
          { type: "ai", message: formattedResponse },
        ]);
      } catch (error) {
        console.error("Error fetching response:", error);
        setChatHistory((prev) => [
          ...prev,
          { type: "ai", message: "Failed to fetch response." },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="chat-container">
      <div
        className="chat-history"
        style={{
          maxHeight: "300px",
          width: "100%",
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
        <input
          type="text"
          value={question}
          onChange={handleQuestionChange}
          placeholder="Ask a question..."
        />
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
