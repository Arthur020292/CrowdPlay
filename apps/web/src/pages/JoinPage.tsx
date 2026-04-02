import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { JoinCodePanel } from "../components/JoinCodePanel";

export function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      return;
    }

    navigate(`/play/${code.trim().toUpperCase()}`);
  };

  return (
    <div className="py-4 sm:py-10">
      <JoinCodePanel code={code} onCodeChange={setCode} onSubmit={handleSubmit} />
    </div>
  );
}
