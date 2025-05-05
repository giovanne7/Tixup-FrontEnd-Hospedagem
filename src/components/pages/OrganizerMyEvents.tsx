import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";

type Evento = {
  id: number;
  nome: string;
  data: string;
  horario: string;
  descricao: string;
  local: string;
  capacidade: string;
  preco: string;
  categoria: string;
  imagem?: string;
  ingressosVendidos?: number;
};

export function OrganizerMyEvents() {
  const [events, setEvents] = useState<Evento[]>([]);

  useEffect(() => {
    const storedEvents = localStorage.getItem("eventos");
    if (storedEvents) {
      const parsedEvents: Evento[] = JSON.parse(storedEvents);
      setEvents(parsedEvents);
      console.log("📋 Eventos carregados do localStorage:", parsedEvents);
    } else {
      console.log("📋 Nenhum evento encontrado no localStorage.");
    }
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;

    console.log(`🗑️ Iniciando exclusão do evento com ID: ${id}`);

    try {
      const token = localStorage.getItem("tixup_token");
      console.log("🔑 Token encontrado:", token ? "Sim" : "Não");

      // Attempt backend deletion if token exists
      if (token) {
        console.log(`📡 Enviando DELETE para http://localhost:5000/api/eventos/${id}`);
        const res = await fetch(`http://localhost:5000/api/eventos/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(`📡 Status da resposta: ${res.status}`);

        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.error("🚨 Resposta não-JSON recebida:", text.slice(0, 200));
          throw new Error("Resposta do servidor não é JSON. Verifique o endpoint ou configuração do servidor.");
        }

        if (!res.ok) {
          const errData = await res.json();
          console.error("🚨 Erro do backend:", errData);
          throw new Error(errData?.message || `Erro ao excluir evento: ${res.status}`);
        }

        console.log("✅ Evento excluído do backend com sucesso.");
      } else {
        console.warn("⚠️ Nenhum token encontrado. Pulando exclusão no backend.");
      }

      // Remove from localStorage
      console.log("🗑️ Removendo evento do localStorage...");
      const updatedEvents = events.filter((event) => event.id !== id);
      localStorage.setItem("eventos", JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      console.log("✅ Evento removido do localStorage. Eventos restantes:", updatedEvents);

      alert("✅ Evento excluído com sucesso!");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      console.error("❌ Erro ao excluir evento:", err);
      alert(`❌ Erro: ${errorMessage}`);

      // Fallback: Remove from localStorage even if backend fails
      console.warn("⚠️ Tentando exclusão apenas no localStorage como fallback...");
      const updatedEvents = events.filter((event) => event.id !== id);
      localStorage.setItem("eventos", JSON.stringify(updatedEvents));
      setEvents(updatedEvents);
      console.log("✅ Fallback: Evento removido do localStorage.", updatedEvents);
      alert("⚠️ Evento excluído localmente, mas houve um erro no servidor. Verifique a conexão com o backend.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Meus Eventos</h1>

      {events.length === 0 ? (
        <p className="text-gray-500">Nenhum evento criado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((evento) => (
            <div
              key={evento.id}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col"
            >
              {evento.imagem && (
                <img
                  src={evento.imagem}
                  alt={evento.nome}
                  className="w-full h-40 object-cover rounded-md mb-4"
                />
              )}
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {evento.nome}
              </h2>
              <p className="text-sm text-gray-500">Data: {evento.data}</p>
              <p className="text-sm text-gray-500">Horário: {evento.horario}</p>
              <p className="text-sm text-gray-500">Local: {evento.local}</p>
              <p className="text-sm text-gray-500">Descrição: {evento.descricao}</p>
              <p className="text-sm text-gray-500">Capacidade: {evento.capacidade}</p>
              <p className="text-sm text-gray-500">Preço: {evento.preco}</p>
              <p className="text-sm text-gray-500">Categoria: {evento.categoria}</p>
              <p className="text-sm text-gray-500 mb-4">
                Ingressos vendidos: {evento.ingressosVendidos || 0}
              </p>

              <div className="flex flex-wrap gap-3 mt-auto">
                <Link
                  to={`/organizer-dashboard/events/${evento.id}/sales`}
                  className="bg-orange-100 text-orange-600 text-sm px-4 py-2 rounded hover:bg-orange-200 transition"
                >
                  Ver Vendas
                </Link>
                <Link
                  to={`/organizer-dashboard/events/${evento.id}/qr`}
                  className="border border-orange-500 text-orange-500 text-sm px-4 py-2 rounded hover:bg-orange-50 transition"
                >
                  Ver QR Codes
                </Link>
                <button
                  onClick={() => handleDelete(evento.id)}
                  className="flex items-center gap-2 bg-red-100 text-red-600 text-sm px-4 py-2 rounded hover:bg-red-200 transition"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}