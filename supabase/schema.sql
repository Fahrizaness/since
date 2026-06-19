-- ==========================================
-- SCHEMA UNTUK APLIKASI 'SINCE' v1.0 (Updated)
-- ==========================================

-- 0. TABEL: KATEGORI
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- Menyimpan kode warna HSL atau kelas warna
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1. TABEL: SEJAK (DAY COUNTER)
CREATE TABLE IF NOT EXISTS public.counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    start_date DATE NOT NULL,
    emoji TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. TABEL: TERAKHIR KALI (MASTER AKTIVITAS)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    emoji TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABEL: LOG AKTIVITAS (1-TO-MANY HISTORY LOG)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
    done_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABEL: MASA DEPAN (FUTURE TIMELINE GOALS)
CREATE TABLE IF NOT EXISTS public.future_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    target_date DATE NOT NULL,
    status BOOLEAN NOT NULL DEFAULT false,
    is_private BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==========================================
-- KEBIJAKAN KEAMANAN (ROW LEVEL SECURITY - RLS)
-- ==========================================

-- Aktifkan RLS pada masing-masing tabel
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_goals ENABLE ROW LEVEL SECURITY;

-- Kebijakan untuk Tabel: categories
CREATE POLICY "Pengguna hanya dapat melihat kategori miliknya" 
    ON public.categories FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat membuat kategori untuk dirinya sendiri" 
    ON public.categories FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat memperbarui kategori miliknya" 
    ON public.categories FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat menghapus kategori miliknya" 
    ON public.categories FOR DELETE 
    USING (auth.uid() = user_id);

-- Kebijakan untuk Tabel: counters
CREATE POLICY "Pengguna hanya dapat melihat counter miliknya" 
    ON public.counters FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat membuat counter untuk dirinya sendiri" 
    ON public.counters FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat memperbarui counter miliknya" 
    ON public.counters FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat menghapus counter miliknya" 
    ON public.counters FOR DELETE 
    USING (auth.uid() = user_id);

-- Kebijakan untuk Tabel: activities
CREATE POLICY "Pengguna hanya dapat melihat aktivitas miliknya" 
    ON public.activities FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat membuat aktivitas untuk dirinya sendiri" 
    ON public.activities FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat memperbarui aktivitas miliknya" 
    ON public.activities FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat menghapus aktivitas miliknya" 
    ON public.activities FOR DELETE 
    USING (auth.uid() = user_id);

-- Kebijakan untuk Tabel: activity_logs
-- Pengguna hanya dapat mengakses log dari aktivitas yang mereka miliki
CREATE POLICY "Pengguna hanya dapat mengelola log aktivitas miliknya"
    ON public.activity_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.activities 
            WHERE activities.id = activity_logs.activity_id 
            AND activities.user_id = auth.uid()
        )
    );

-- Kebijakan untuk Tabel: future_goals
CREATE POLICY "Pengguna hanya dapat melihat target miliknya" 
    ON public.future_goals FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat membuat target untuk dirinya sendiri" 
    ON public.future_goals FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat memperbarui target miliknya" 
    ON public.future_goals FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Pengguna hanya dapat menghapus target miliknya" 
    ON public.future_goals FOR DELETE 
    USING (auth.uid() = user_id);

-- ==========================================
-- INDEKS OPTIMISASI PERFORMA
-- ==========================================
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS counters_user_id_idx ON public.counters(user_id);
CREATE INDEX IF NOT EXISTS counters_category_id_idx ON public.counters(category_id);
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS activities_category_id_idx ON public.activities(category_id);
CREATE INDEX IF NOT EXISTS activity_logs_activity_id_idx ON public.activity_logs(activity_id);
CREATE INDEX IF NOT EXISTS future_goals_user_id_idx ON public.future_goals(user_id);
CREATE INDEX IF NOT EXISTS future_goals_category_id_idx ON public.future_goals(category_id);
