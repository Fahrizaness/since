// src/lib/ai.ts
// Modul Integrasi AI (SumoPod / OpenAI-compatible API)
import { parseLocalDate } from './db';

const apiKey = import.meta.env.VITE_AI_API_KEY || '';
const apiBaseUrl = import.meta.env.VITE_AI_API_BASE_URL || 'https://api.openai.com/v1';
const modelName = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini';

export function isAIConfigured(): boolean {
  return !!apiKey && apiKey.trim().length > 0;
}

interface AIChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
}

// Bantuan untuk mengirim request ke endpoint chat completions
async function fetchChatCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!isAIConfigured()) {
    throw new Error('Kunci API AI belum dikonfigurasi di file .env');
  }

  // Bersihkan slash di akhir base URL jika ada
  const cleanBaseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  const url = `${cleanBaseUrl}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal menghubungi API AI (Status: ${response.status})`);
  }

  const data = (await response.json()) as AIChatCompletionResponse;
  return data.choices[0]?.message?.content || '';
}

/**
 * Menghasilkan kalimat coaching personal (insight) berdasarkan data kebiasaan & momen pengguna.
 */
export async function generateAICoaching(
  activities: Array<{ title: string; last_done_date?: string; emoji: string }>,
  counters: Array<{ title: string; start_date: string; emoji: string }>,
  goals: Array<{ title: string; target_date: string; status: boolean }>
): Promise<string> {
  const systemPrompt = 
    "Anda adalah AI Coach pembimbing personal untuk aplikasi Since (aplikasi pencatat waktu dan jurnal kebiasaan). " +
    "Tugas Anda adalah menganalisis data pengguna dan memberikan insight motivasi harian yang ringkas, hangat, menyemangati, dan tajam (maksimal 2 kalimat pendek) dalam Bahasa Indonesia. " +
    "Fokus pada konsistensi kebiasaan (terakhir dilakukan) atau ingatkan tentang peristiwa penting (counters) dan target masa depan. " +
    "Jawablah langsung ke isi pesan motivasi tanpa kata pembuka seperti 'Halo!' atau 'Berdasarkan data Anda...'.";

  // Susun data ringkas untuk prompt
  const activeGoals = goals.filter(g => !g.status);
  const now = new Date();
  
  // Format hari ini dalam Bahasa Indonesia untuk referensi AI
  const todayFormatted = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Set jam ke 00:00:00 local time untuk pencocokan hari bulat yang presisi
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const activitiesText = activities.slice(0, 5).map(a => {
    if (!a.last_done_date) return `- ${a.emoji} ${a.title}: belum pernah`;
    const lastDone = parseLocalDate(a.last_done_date);
    const diff = Math.round((todayMidnight.getTime() - lastDone.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return `- ${a.emoji} ${a.title}: terakhir hari ini`;
    if (diff === 1) return `- ${a.emoji} ${a.title}: terakhir kemarin`;
    return `- ${a.emoji} ${a.title}: terakhir ${diff} hari yang lalu`;
  }).join('\n');

  const countersText = counters.slice(0, 3).map(c => {
    const start = parseLocalDate(c.start_date);
    const diff = Math.round((todayMidnight.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return `- ${c.emoji} ${c.title}: mulai hari ini`;
    if (diff === 1) return `- ${c.emoji} ${c.title}: mulai kemarin`;
    return `- ${c.emoji} ${c.title}: sudah berlalu ${diff} hari`;
  }).join('\n');

  const goalsText = activeGoals.slice(0, 3).map(g => {
    const target = parseLocalDate(g.target_date);
    const diff = Math.round((target.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return `- 🎯 ${g.title}: hari ini!`;
    if (diff === 1) return `- 🎯 ${g.title}: besok!`;
    if (diff < 0) return `- 🎯 ${g.title}: terlewat ${Math.abs(diff)} hari`;
    return `- 🎯 ${g.title}: ${diff} hari lagi`;
  }).join('\n');

  const userPrompt = 
    `Tanggal Hari Ini (Lokal): ${todayFormatted}\n\n` +
    `Aktivitas Terakhir Pengguna:\n${activitiesText || 'Tidak ada'}\n\n` +
    `Momen Sejak:\n${countersText || 'Tidak ada'}\n\n` +
    `Target Masa Depan:\n${goalsText || 'Tidak ada'}`;

  try {
    return await fetchChatCompletion(systemPrompt, userPrompt);
  } catch (error) {
    console.error('generateAICoaching error:', error);
    throw error;
  }
}

/**
 * Memecah target masa depan menjadi rencana aksi bulanan yang konkret (3-4 langkah).
 */
export async function generateGoalActionPlan(goalTitle: string, targetDate: string): Promise<string[]> {
  const systemPrompt = 
    "Anda adalah AI Planner profesional untuk aplikasi Since. " +
    "Tugas Anda adalah membantu pengguna memecah target masa depan mereka menjadi rencana langkah demi langkah yang logis, terstruktur, dan realistis (maksimal 4 langkah konkret). " +
    "Setiap langkah harus pendek dan langsung dapat dijalankan. " +
    "PENTING: Tanggapan Anda WAJIB berupa array JSON string yang valid saja, dengan format: " +
    "[\"Langkah 1: ...\", \"Langkah 2: ...\", \"Langkah 3: ...\", \"Langkah 4: ...\"]. " +
    "Jangan berikan penjelasan pembuka, penutup, atau tanda markdown (seperti ```json) di luar array JSON tersebut. Tanggapan Anda akan diparse langsung menggunakan JSON.parse() di frontend.";

  const userPrompt = `Target Target: "${goalTitle}" dengan tanggal target penyelesaian: ${targetDate}`;

  try {
    const textResponse = await fetchChatCompletion(systemPrompt, userPrompt);
    // Bersihkan markdown code block jika model keras kepala menyertakannya
    const cleanedText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText) as string[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [
      `Langkah 1: Lakukan riset awal untuk target "${goalTitle}"`,
      `Langkah 2: Buat jadwal/timeline rutin mingguan`,
      `Langkah 3: Jalankan rencana aksi dan pantau progres secara berkala`,
      `Langkah 4: Evaluasi pencapaian sebelum ${targetDate}`
    ];
  } catch (error) {
    console.error('generateGoalActionPlan error:', error);
    // Fallback static plan
    return [
      `Langkah 1: Lakukan riset dan persiapan dasar untuk target "${goalTitle}"`,
      `Langkah 2: Tentukan milestones kecil bulanan`,
      `Langkah 3: Lakukan aksi konsisten secara mingguan`,
      `Langkah 4: Lakukan tinjauan menyeluruh sebelum tenggat waktu ${targetDate}`
    ];
  }
}
