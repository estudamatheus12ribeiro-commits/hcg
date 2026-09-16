export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          criado_em: string
          custo_estimado_usd: number | null
          funcionalidade: string
          id: string
          modelo: string | null
          profile_id: string | null
          tokens_entrada: number | null
          tokens_saida: number | null
        }
        Insert: {
          criado_em?: string
          custo_estimado_usd?: number | null
          funcionalidade: string
          id?: string
          modelo?: string | null
          profile_id?: string | null
          tokens_entrada?: number | null
          tokens_saida?: number | null
        }
        Update: {
          criado_em?: string
          custo_estimado_usd?: number | null
          funcionalidade?: string
          id?: string
          modelo?: string | null
          profile_id?: string | null
          tokens_entrada?: number | null
          tokens_saida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alternatives: {
        Row: {
          id: string
          imagem_path: string | null
          letra: string
          ordem: number
          question_id: string
          texto: string
        }
        Insert: {
          id?: string
          imagem_path?: string | null
          letra: string
          ordem?: number
          question_id: string
          texto: string
        }
        Update: {
          id?: string
          imagem_path?: string | null
          letra?: string
          ordem?: number
          question_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "alternatives_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_key_recompute_log: {
        Row: {
          executado_em: string
          id: string
          impacto: Json
          question_id: string
          versao_anterior: number | null
          versao_nova: number
        }
        Insert: {
          executado_em?: string
          id?: string
          impacto?: Json
          question_id: string
          versao_anterior?: number | null
          versao_nova: number
        }
        Update: {
          executado_em?: string
          id?: string
          impacto?: Json
          question_id?: string
          versao_anterior?: number | null
          versao_nova?: number
        }
        Relationships: [
          {
            foreignKeyName: "answer_key_recompute_log_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_keys: {
        Row: {
          anulada: boolean
          ativo: boolean
          criado_em: string
          fonte_arquivo_id: string | null
          fonte_pagina: number | null
          id: string
          justificativa: string | null
          question_id: string
          resposta_alterada: boolean
          resposta_letra: string | null
          status: Database["public"]["Enums"]["status_gabarito"]
          versao: number
        }
        Insert: {
          anulada?: boolean
          ativo?: boolean
          criado_em?: string
          fonte_arquivo_id?: string | null
          fonte_pagina?: number | null
          id?: string
          justificativa?: string | null
          question_id: string
          resposta_alterada?: boolean
          resposta_letra?: string | null
          status?: Database["public"]["Enums"]["status_gabarito"]
          versao: number
        }
        Update: {
          anulada?: boolean
          ativo?: boolean
          criado_em?: string
          fonte_arquivo_id?: string | null
          fonte_pagina?: number | null
          id?: string
          justificativa?: string | null
          question_id?: string
          resposta_alterada?: boolean
          resposta_letra?: string | null
          status?: Database["public"]["Enums"]["status_gabarito"]
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_fonte_arquivo_id_fkey"
            columns: ["fonte_arquivo_id"]
            isOneToOne: false
            referencedRelation: "exam_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          alternativa_escolhida_id: string | null
          anotacao: string | null
          answer_key_versao_utilizada: number | null
          block_id: string
          categoria_resultado:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
          categoria_resultado_atual:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
          causa_confirmada_pelo_usuario: boolean | null
          causa_provavel_final:
            | Database["public"]["Enums"]["causa_provavel"]
            | null
          causa_provavel_sugerida:
            | Database["public"]["Enums"]["causa_provavel"]
            | null
          confianca: Database["public"]["Enums"]["nivel_confianca"] | null
          id: string
          is_primeira_tentativa: boolean
          profile_id: string
          question_id: string
          respondido_em: string
          sem_resposta: boolean
          tempo_ativo_segundos: number | null
          trocou_resposta: boolean
        }
        Insert: {
          alternativa_escolhida_id?: string | null
          anotacao?: string | null
          answer_key_versao_utilizada?: number | null
          block_id: string
          categoria_resultado?:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
          categoria_resultado_atual?:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
          causa_confirmada_pelo_usuario?: boolean | null
          causa_provavel_final?:
            | Database["public"]["Enums"]["causa_provavel"]
            | null
          causa_provavel_sugerida?:
            | Database["public"]["Enums"]["causa_provavel"]
            | null
          confianca?: Database["public"]["Enums"]["nivel_confianca"] | null
          id?: string
          is_primeira_tentativa?: boolean
          profile_id: string
          question_id: string
          respondido_em?: string
          sem_resposta?: boolean
          tempo_ativo_segundos?: number | null
          trocou_resposta?: boolean
        }
        Update: {
          alternativa_escolhida_id?: string | null
          anotacao?: string | null
          answer_key_versao_utilizada?: number | null
          block_id?: string
          categoria_resultado?:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
          categoria_resultado_atual?:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
          causa_confirmada_pelo_usuario?: boolean | null
          causa_provavel_final?:
            | Database["public"]["Enums"]["causa_provavel"]
            | null
          causa_provavel_sugerida?:
            | Database["public"]["Enums"]["causa_provavel"]
            | null
          confianca?: Database["public"]["Enums"]["nivel_confianca"] | null
          id?: string
          is_primeira_tentativa?: boolean
          profile_id?: string
          question_id?: string
          respondido_em?: string
          sem_resposta?: boolean
          tempo_ativo_segundos?: number | null
          trocou_resposta?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attempts_alternativa_escolhida_id_fkey"
            columns: ["alternativa_escolhida_id"]
            isOneToOne: false
            referencedRelation: "alternatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "study_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      block_questions: {
        Row: {
          block_id: string
          id: string
          ordem: number
          question_id: string
        }
        Insert: {
          block_id: string
          id?: string
          ordem: number
          question_id: string
        }
        Update: {
          block_id?: string
          id?: string
          ordem?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_questions_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "study_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          assuntos_prioritarios: Json
          block_id: string
          gerado_em: string
          id: string
          profile_id: string
          resumo: Json
        }
        Insert: {
          assuntos_prioritarios?: Json
          block_id: string
          gerado_em?: string
          id?: string
          profile_id: string
          resumo?: Json
        }
        Update: {
          assuntos_prioritarios?: Json
          block_id?: string
          gerado_em?: string
          id?: string
          profile_id?: string
          resumo?: Json
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "study_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_extraction_flags: {
        Row: {
          criado_em: string
          descricao: string
          exam_file_id: string
          id: string
          pagina: number | null
          resolvido: boolean
          tipo: string
        }
        Insert: {
          criado_em?: string
          descricao: string
          exam_file_id: string
          id?: string
          pagina?: number | null
          resolvido?: boolean
          tipo: string
        }
        Update: {
          criado_em?: string
          descricao?: string
          exam_file_id?: string
          id?: string
          pagina?: number | null
          resolvido?: boolean
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_extraction_flags_exam_file_id_fkey"
            columns: ["exam_file_id"]
            isOneToOne: false
            referencedRelation: "exam_files"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_files: {
        Row: {
          criado_em: string
          enviado_por: string | null
          erro_mensagem: string | null
          exam_id: string
          extracao_bruta: Json | null
          id: string
          nome_original: string
          ocr_utilizado: boolean
          processado_em: string | null
          progresso: number
          status: Database["public"]["Enums"]["status_processamento"]
          storage_path: string
          tentativas: number
          tipo: Database["public"]["Enums"]["tipo_arquivo_prova"]
        }
        Insert: {
          criado_em?: string
          enviado_por?: string | null
          erro_mensagem?: string | null
          exam_id: string
          extracao_bruta?: Json | null
          id?: string
          nome_original: string
          ocr_utilizado?: boolean
          processado_em?: string | null
          progresso?: number
          status?: Database["public"]["Enums"]["status_processamento"]
          storage_path: string
          tentativas?: number
          tipo: Database["public"]["Enums"]["tipo_arquivo_prova"]
        }
        Update: {
          criado_em?: string
          enviado_por?: string | null
          erro_mensagem?: string | null
          exam_id?: string
          extracao_bruta?: Json | null
          id?: string
          nome_original?: string
          ocr_utilizado?: boolean
          processado_em?: string | null
          progresso?: number
          status?: Database["public"]["Enums"]["status_processamento"]
          storage_path?: string
          tentativas?: number
          tipo?: Database["public"]["Enums"]["tipo_arquivo_prova"]
        }
        Relationships: [
          {
            foreignKeyName: "exam_files_enviado_por_fkey"
            columns: ["enviado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_files_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          ano: number | null
          area: Database["public"]["Enums"]["area_estudo"]
          banca: string | null
          cargo_ou_exame: string | null
          criado_em: string
          criado_por: string | null
          edital_url: string | null
          id: string
          instituicao: string | null
          numero_caderno: string | null
          tipo_caderno: string | null
          titulo: string
        }
        Insert: {
          ano?: number | null
          area: Database["public"]["Enums"]["area_estudo"]
          banca?: string | null
          cargo_ou_exame?: string | null
          criado_em?: string
          criado_por?: string | null
          edital_url?: string | null
          id?: string
          instituicao?: string | null
          numero_caderno?: string | null
          tipo_caderno?: string | null
          titulo: string
        }
        Update: {
          ano?: number | null
          area?: Database["public"]["Enums"]["area_estudo"]
          banca?: string | null
          cargo_ou_exame?: string | null
          criado_em?: string
          criado_por?: string | null
          edital_url?: string | null
          id?: string
          instituicao?: string | null
          numero_caderno?: string | null
          tipo_caderno?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fontes: {
        Row: {
          area: Database["public"]["Enums"]["area_estudo"]
          criado_em: string
          data_publicacao: string | null
          data_ultima_consulta: string | null
          id: string
          instituicao: string | null
          intervalo_verificacao_dias: number
          status_verificacao: Database["public"]["Enums"]["status_verificacao_fonte"]
          titulo: string
          ultima_execucao_em: string | null
          ultima_execucao_falhou: boolean
          ultimo_erro: string | null
          ultimo_hash_conteudo: string | null
          url: string | null
          verificacao_automatica_ativa: boolean
        }
        Insert: {
          area: Database["public"]["Enums"]["area_estudo"]
          criado_em?: string
          data_publicacao?: string | null
          data_ultima_consulta?: string | null
          id?: string
          instituicao?: string | null
          intervalo_verificacao_dias?: number
          status_verificacao?: Database["public"]["Enums"]["status_verificacao_fonte"]
          titulo: string
          ultima_execucao_em?: string | null
          ultima_execucao_falhou?: boolean
          ultimo_erro?: string | null
          ultimo_hash_conteudo?: string | null
          url?: string | null
          verificacao_automatica_ativa?: boolean
        }
        Update: {
          area?: Database["public"]["Enums"]["area_estudo"]
          criado_em?: string
          data_publicacao?: string | null
          data_ultima_consulta?: string | null
          id?: string
          instituicao?: string | null
          intervalo_verificacao_dias?: number
          status_verificacao?: Database["public"]["Enums"]["status_verificacao_fonte"]
          titulo?: string
          ultima_execucao_em?: string | null
          ultima_execucao_falhou?: boolean
          ultimo_erro?: string | null
          ultimo_hash_conteudo?: string | null
          url?: string | null
          verificacao_automatica_ativa?: boolean
        }
        Relationships: []
      }
      goals: {
        Row: {
          ativa: boolean
          criado_em: string
          descricao: string
          id: string
          periodo: string | null
          profile_id: string
          unidade: string | null
          valor_alvo: number | null
        }
        Insert: {
          ativa?: boolean
          criado_em?: string
          descricao: string
          id?: string
          periodo?: string | null
          profile_id: string
          unidade?: string | null
          valor_alvo?: number | null
        }
        Update: {
          ativa?: boolean
          criado_em?: string
          descricao?: string
          id?: string
          periodo?: string | null
          profile_id?: string
          unidade?: string | null
          valor_alvo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdfs: {
        Row: {
          block_id: string | null
          gerado_em: string
          id: string
          profile_id: string
          storage_path: string
          substitui_pdf_id: string | null
          tipo: Database["public"]["Enums"]["tipo_pdf"]
          titulo: string
          versao: number
        }
        Insert: {
          block_id?: string | null
          gerado_em?: string
          id?: string
          profile_id: string
          storage_path: string
          substitui_pdf_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pdf"]
          titulo: string
          versao?: number
        }
        Update: {
          block_id?: string | null
          gerado_em?: string
          id?: string
          profile_id?: string
          storage_path?: string
          substitui_pdf_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_pdf"]
          titulo?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "pdfs_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "study_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdfs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdfs_substitui_pdf_id_fkey"
            columns: ["substitui_pdf_id"]
            isOneToOne: false
            referencedRelation: "pdfs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: Database["public"]["Enums"]["area_estudo"]
          criado_em: string
          id: string
          nome_exibicao: string
        }
        Insert: {
          area: Database["public"]["Enums"]["area_estudo"]
          criado_em?: string
          id: string
          nome_exibicao: string
        }
        Update: {
          area?: Database["public"]["Enums"]["area_estudo"]
          criado_em?: string
          id?: string
          nome_exibicao?: string
        }
        Relationships: []
      }
      question_sources: {
        Row: {
          fonte_id: string
          question_id: string
        }
        Insert: {
          fonte_id: string
          question_id: string
        }
        Update: {
          fonte_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_sources_fonte_id_fkey"
            columns: ["fonte_id"]
            isOneToOne: false
            referencedRelation: "fontes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_sources_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          area: Database["public"]["Enums"]["area_estudo"]
          assunto: string | null
          criado_em: string
          criado_por: string | null
          dificuldade: Database["public"]["Enums"]["dificuldade_estimada"]
          disciplina: string | null
          enunciado: string
          exam_file_id: string | null
          exam_id: string | null
          gerado_por_ia_em: string | null
          gerado_por_ia_prompt: string | null
          ia_modelo: string | null
          id: string
          motivo_revisao: string | null
          numero_no_caderno: string | null
          origem: Database["public"]["Enums"]["origem_questao"]
          pagina_origem: number | null
          status: Database["public"]["Enums"]["status_questao"]
          subassunto: string | null
          tem_imagem: boolean
          tipo_raciocinio: string | null
        }
        Insert: {
          area: Database["public"]["Enums"]["area_estudo"]
          assunto?: string | null
          criado_em?: string
          criado_por?: string | null
          dificuldade?: Database["public"]["Enums"]["dificuldade_estimada"]
          disciplina?: string | null
          enunciado: string
          exam_file_id?: string | null
          exam_id?: string | null
          gerado_por_ia_em?: string | null
          gerado_por_ia_prompt?: string | null
          ia_modelo?: string | null
          id?: string
          motivo_revisao?: string | null
          numero_no_caderno?: string | null
          origem?: Database["public"]["Enums"]["origem_questao"]
          pagina_origem?: number | null
          status?: Database["public"]["Enums"]["status_questao"]
          subassunto?: string | null
          tem_imagem?: boolean
          tipo_raciocinio?: string | null
        }
        Update: {
          area?: Database["public"]["Enums"]["area_estudo"]
          assunto?: string | null
          criado_em?: string
          criado_por?: string | null
          dificuldade?: Database["public"]["Enums"]["dificuldade_estimada"]
          disciplina?: string | null
          enunciado?: string
          exam_file_id?: string | null
          exam_id?: string | null
          gerado_por_ia_em?: string | null
          gerado_por_ia_prompt?: string | null
          ia_modelo?: string | null
          id?: string
          motivo_revisao?: string | null
          numero_no_caderno?: string | null
          origem?: Database["public"]["Enums"]["origem_questao"]
          pagina_origem?: number | null
          status?: Database["public"]["Enums"]["status_questao"]
          subassunto?: string | null
          tem_imagem?: boolean
          tipo_raciocinio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_exam_file_id_fkey"
            columns: ["exam_file_id"]
            isOneToOne: false
            referencedRelation: "exam_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      review_queue: {
        Row: {
          assunto: string | null
          criado_em: string
          data_prevista: string
          disciplina: string | null
          id: string
          intervalo_dias: number
          motivo: string
          origem_attempt_id: string | null
          origem_question_id: string | null
          profile_id: string
          sequencia_acertos: number
          status: Database["public"]["Enums"]["status_fila_revisao"]
          subassunto: string | null
          ultima_revisao_em: string | null
          ultimo_resultado:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
        }
        Insert: {
          assunto?: string | null
          criado_em?: string
          data_prevista: string
          disciplina?: string | null
          id?: string
          intervalo_dias?: number
          motivo: string
          origem_attempt_id?: string | null
          origem_question_id?: string | null
          profile_id: string
          sequencia_acertos?: number
          status?: Database["public"]["Enums"]["status_fila_revisao"]
          subassunto?: string | null
          ultima_revisao_em?: string | null
          ultimo_resultado?:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
        }
        Update: {
          assunto?: string | null
          criado_em?: string
          data_prevista?: string
          disciplina?: string | null
          id?: string
          intervalo_dias?: number
          motivo?: string
          origem_attempt_id?: string | null
          origem_question_id?: string | null
          profile_id?: string
          sequencia_acertos?: number
          status?: Database["public"]["Enums"]["status_fila_revisao"]
          subassunto?: string | null
          ultima_revisao_em?: string | null
          ultimo_resultado?:
            | Database["public"]["Enums"]["categoria_resultado"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "review_queue_origem_attempt_id_fkey"
            columns: ["origem_attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_queue_origem_question_id_fkey"
            columns: ["origem_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_queue_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          atualizado_em: string
          chave: string
          profile_id: string
          valor: Json
        }
        Insert: {
          atualizado_em?: string
          chave: string
          profile_id: string
          valor: Json
        }
        Update: {
          atualizado_em?: string
          chave?: string
          profile_id?: string
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_dashboard_consent: {
        Row: {
          atualizado_em: string
          opt_in: boolean
          profile_id: string
        }
        Insert: {
          atualizado_em?: string
          opt_in?: boolean
          profile_id: string
        }
        Update: {
          atualizado_em?: string
          opt_in?: boolean
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_dashboard_consent_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      simulados: {
        Row: {
          banca: string | null
          block_id: string | null
          criado_em: string
          criterio_distribuicao: string | null
          data_prova: string | null
          edital_exam_id: string | null
          id: string
          profile_id: string
          regras_pontuacao: Json | null
          status: Database["public"]["Enums"]["status_simulado"]
          tempo_limite_minutos: number | null
          titulo: string
        }
        Insert: {
          banca?: string | null
          block_id?: string | null
          criado_em?: string
          criterio_distribuicao?: string | null
          data_prova?: string | null
          edital_exam_id?: string | null
          id?: string
          profile_id: string
          regras_pontuacao?: Json | null
          status?: Database["public"]["Enums"]["status_simulado"]
          tempo_limite_minutos?: number | null
          titulo: string
        }
        Update: {
          banca?: string | null
          block_id?: string | null
          criado_em?: string
          criterio_distribuicao?: string | null
          data_prova?: string | null
          edital_exam_id?: string | null
          id?: string
          profile_id?: string
          regras_pontuacao?: Json | null
          status?: Database["public"]["Enums"]["status_simulado"]
          tempo_limite_minutos?: number | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulados_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "study_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulados_edital_exam_id_fkey"
            columns: ["edital_exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "simulados_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_blocks: {
        Row: {
          area: Database["public"]["Enums"]["area_estudo"]
          criado_em: string
          exam_id: string | null
          filtros: Json
          finalizado_em: string | null
          id: string
          modo: Database["public"]["Enums"]["modo_bloco"]
          profile_id: string
          status: Database["public"]["Enums"]["status_bloco"]
        }
        Insert: {
          area: Database["public"]["Enums"]["area_estudo"]
          criado_em?: string
          exam_id?: string | null
          filtros?: Json
          finalizado_em?: string | null
          id?: string
          modo?: Database["public"]["Enums"]["modo_bloco"]
          profile_id: string
          status?: Database["public"]["Enums"]["status_bloco"]
        }
        Update: {
          area?: Database["public"]["Enums"]["area_estudo"]
          criado_em?: string
          exam_id?: string | null
          filtros?: Json
          finalizado_em?: string | null
          id?: string
          modo?: Database["public"]["Enums"]["modo_bloco"]
          profile_id?: string
          status?: Database["public"]["Enums"]["status_bloco"]
        }
        Relationships: [
          {
            foreignKeyName: "study_blocks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_blocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_area: {
        Args: never
        Returns: Database["public"]["Enums"]["area_estudo"]
      }
      painel_conjunto: {
        Args: never
        Returns: {
          area: Database["public"]["Enums"]["area_estudo"]
          blocos_concluidos_30d: number
          dias_estudo_30d: number
          metas_ativas: number
          nome_exibicao: string
          perfil_id: string
        }[]
      }
    }
    Enums: {
      area_estudo: "concursos" | "medicina"
      categoria_resultado:
        | "acerto_seguro"
        | "acerto_duvida"
        | "acerto_chute"
        | "erro_duvida"
        | "erro_confianca"
        | "sem_resposta"
      causa_provavel:
        | "conteudo"
        | "interpretacao"
        | "calculo"
        | "desatencao"
        | "atualizacao"
        | "gestao_tempo"
        | "nao_classificada"
      dificuldade_estimada: "facil" | "media" | "dificil" | "nao_estimada"
      modo_bloco: "estudo" | "simulado"
      nivel_confianca: "certeza" | "duvida" | "chute"
      origem_questao: "importada" | "ia" | "mista"
      status_bloco: "em_andamento" | "concluido" | "abandonado"
      status_fila_revisao: "pendente" | "concluida" | "adiada"
      status_gabarito:
        | "ausente"
        | "extraoficial"
        | "oficial_preliminar"
        | "oficial_definitivo"
      status_processamento:
        | "pendente"
        | "processando"
        | "extraido"
        | "revisao_pendente"
        | "confirmado"
        | "erro"
      status_questao: "rascunho" | "revisao_pendente" | "confirmada" | "anulada"
      status_simulado: "planejado" | "em_andamento" | "concluido"
      status_verificacao_fonte:
        | "nao_verificada"
        | "verificada"
        | "desatualizada"
        | "falha"
      tipo_arquivo_prova: "prova" | "gabarito" | "edital" | "outro"
      tipo_pdf: "bloco" | "semanal" | "assunto" | "prova" | "consolidado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      area_estudo: ["concursos", "medicina"],
      categoria_resultado: [
        "acerto_seguro",
        "acerto_duvida",
        "acerto_chute",
        "erro_duvida",
        "erro_confianca",
        "sem_resposta",
      ],
      causa_provavel: [
        "conteudo",
        "interpretacao",
        "calculo",
        "desatencao",
        "atualizacao",
        "gestao_tempo",
        "nao_classificada",
      ],
      dificuldade_estimada: ["facil", "media", "dificil", "nao_estimada"],
      modo_bloco: ["estudo", "simulado"],
      nivel_confianca: ["certeza", "duvida", "chute"],
      origem_questao: ["importada", "ia", "mista"],
      status_bloco: ["em_andamento", "concluido", "abandonado"],
      status_fila_revisao: ["pendente", "concluida", "adiada"],
      status_gabarito: [
        "ausente",
        "extraoficial",
        "oficial_preliminar",
        "oficial_definitivo",
      ],
      status_processamento: [
        "pendente",
        "processando",
        "extraido",
        "revisao_pendente",
        "confirmado",
        "erro",
      ],
      status_questao: ["rascunho", "revisao_pendente", "confirmada", "anulada"],
      status_simulado: ["planejado", "em_andamento", "concluido"],
      status_verificacao_fonte: [
        "nao_verificada",
        "verificada",
        "desatualizada",
        "falha",
      ],
      tipo_arquivo_prova: ["prova", "gabarito", "edital", "outro"],
      tipo_pdf: ["bloco", "semanal", "assunto", "prova", "consolidado"],
    },
  },
} as const
