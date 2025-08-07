import React, { useState, useEffect } from "react";
import { X, Calendar, Save } from "lucide-react";
import styles from "./CreateGameModal.module.scss";

interface Equipe {
  id: number;
  nome: string;
  grupoId: number;
}

interface Grupo {
  id: number;
  nome: string;
}

interface CreateGameModalProps {
  clientId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateGameModal({
  clientId,
  onClose,
  onSuccess,
}: CreateGameModalProps) {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    grupoId: "",
    equipeAId: "",
    equipeBId: "",
    rodada: "",
    data: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        // Busca as equipes filtradas pelo clientId e grupos filtrados pelo clientId
        const [equipesRes, gruposRes] = await Promise.all([
          fetch(`/api/equipes?clientId=${clientId ?? ""}`),
          fetch(`/api/grupos?clientId=${clientId ?? ""}`),
        ]);

        if (equipesRes.ok && gruposRes.ok) {
          const equipesData = await equipesRes.json();
          const gruposData = await gruposRes.json();
          setEquipes(equipesData);
          setGrupos(gruposData);
        } else {
          console.error("Erro ao carregar equipes ou grupos");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!formData.grupoId) newErrors.grupoId = "Selecione um grupo";
    if (!formData.equipeAId)
      newErrors.equipeAId = "Selecione a equipe mandante";
    if (!formData.equipeBId)
      newErrors.equipeBId = "Selecione a equipe visitante";
    if (formData.equipeAId === formData.equipeBId && formData.equipeAId) {
      newErrors.equipeBId = "As equipes devem ser diferentes";
    }
    if (!formData.rodada) newErrors.rodada = "Informe a rodada";
    if (!formData.data) newErrors.data = "Selecione data e hora";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/jogos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipeAId: parseInt(formData.equipeAId, 10),
          equipeBId: parseInt(formData.equipeBId, 10),
          grupoId: parseInt(formData.grupoId, 10),
          rodada: parseInt(formData.rodada, 10),
          data: formData.data,
          clientId, // Envia clientId para salvar o jogo vinculado ao cliente
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        setErrors({ general: errorData.error || "Erro ao criar jogo" });
      }
    } catch (error) {
      console.error("Erro ao criar jogo:", error);
      setErrors({ general: "Erro ao criar jogo" });
    } finally {
      setSaving(false);
    }
  };

  const equipesDoGrupo = equipes.filter(
    (e) => e.grupoId === parseInt(formData.grupoId, 10)
  );

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <Calendar size={24} />
            Criar Novo Jogo
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalContent}>
          {errors.general && (
            <div className={styles.errorMessage}>{errors.general}</div>
          )}

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Grupo *</label>
              <select
                value={formData.grupoId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    grupoId: e.target.value,
                    equipeAId: "",
                    equipeBId: "",
                  })
                }
                className={errors.grupoId ? styles.inputError : ""}
                disabled={loading}
              >
                <option value="">Selecione o grupo</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    Grupo {grupo.nome}
                  </option>
                ))}
              </select>
              {errors.grupoId && (
                <span className={styles.fieldError}>{errors.grupoId}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Rodada *</label>
              <input
                type="number"
                value={formData.rodada}
                onChange={(e) =>
                  setFormData({ ...formData, rodada: e.target.value })
                }
                className={errors.rodada ? styles.inputError : ""}
                min="1"
                placeholder="Ex: 1"
              />
              {errors.rodada && (
                <span className={styles.fieldError}>{errors.rodada}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Equipe Mandante *</label>
              <select
                value={formData.equipeAId}
                onChange={(e) =>
                  setFormData({ ...formData, equipeAId: e.target.value })
                }
                className={errors.equipeAId ? styles.inputError : ""}
                disabled={!formData.grupoId}
              >
                <option value="">Selecione a equipe mandante</option>
                {equipesDoGrupo.map((equipe) => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </select>
              {errors.equipeAId && (
                <span className={styles.fieldError}>{errors.equipeAId}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Equipe Visitante *</label>
              <select
                value={formData.equipeBId}
                onChange={(e) =>
                  setFormData({ ...formData, equipeBId: e.target.value })
                }
                className={errors.equipeBId ? styles.inputError : ""}
                disabled={!formData.grupoId}
              >
                <option value="">Selecione a equipe visitante</option>
                {equipesDoGrupo
                  .filter((e) => e.id !== parseInt(formData.equipeAId, 10))
                  .map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>
                      {equipe.nome}
                    </option>
                  ))}
              </select>
              {errors.equipeBId && (
                <span className={styles.fieldError}>{errors.equipeBId}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Data e Hora *</label>
              <input
                type="datetime-local"
                value={formData.data}
                onChange={(e) =>
                  setFormData({ ...formData, data: e.target.value })
                }
                className={errors.data ? styles.inputError : ""}
              />
              {errors.data && (
                <span className={styles.fieldError}>{errors.data}</span>
              )}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? (
                <>
                  <div className={styles.spinning}>
                    <Save size={16} />
                  </div>
                  Criando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Criar Jogo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
