-- ==============================================================================
-- BASE DE DATOS Y EXTENSIONES: BACHATA HOY / BACHATA CERCA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'organizer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('borrador', 'pendiente', 'publicado', 'rechazado', 'cancelado');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_category AS ENUM ('social', 'clase', 'taller', 'festival', 'practica');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    avatar_url TEXT,
    bio TEXT,
    instagram_handle TEXT,
    whatsapp_phone TEXT,
    website_url TEXT,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    flyer_url TEXT NOT NULL,
    flyer_aspect_ratio NUMERIC DEFAULT 0.75,
    category event_category NOT NULL DEFAULT 'social',
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    
    venue_name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'Buenos Aires',
    country TEXT NOT NULL DEFAULT 'Argentina',
    location GEOGRAPHY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    price NUMERIC(10, 2),
    currency TEXT NOT NULL DEFAULT 'ARS',
    tickets_url TEXT,
    
    organizer_name TEXT NOT NULL,
    organizer_whatsapp TEXT,
    organizer_instagram TEXT,
    
    status event_status NOT NULL DEFAULT 'pendiente',
    rejection_reason TEXT,
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    cancellation_notice TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT check_dates_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_events_location ON public.events USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_events_status_dates ON public.events (status, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events (organizer_id);

CREATE TABLE IF NOT EXISTS public.favorites (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, event_id)
);

CREATE TABLE IF NOT EXISTS public.event_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_email TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_nearby_events(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT 25.0,
    filter_category event_category DEFAULT NULL,
    filter_date_start TIMESTAMPTZ DEFAULT NULL,
    filter_date_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    organizer_id UUID,
    title TEXT,
    description TEXT,
    flyer_url TEXT,
    flyer_aspect_ratio NUMERIC,
    category event_category,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    timezone TEXT,
    venue_name TEXT,
    address TEXT,
    city TEXT,
    province TEXT,
    country TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    is_free BOOLEAN,
    price NUMERIC,
    currency TEXT,
    tickets_url TEXT,
    organizer_name TEXT,
    organizer_whatsapp TEXT,
    organizer_instagram TEXT,
    status event_status,
    is_cancelled BOOLEAN,
    cancellation_notice TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_point GEOGRAPHY;
BEGIN
    user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::GEOGRAPHY;
    
    RETURN QUERY
    SELECT 
        e.id,
        e.organizer_id,
        e.title,
        e.description,
        e.flyer_url,
        e.flyer_aspect_ratio,
        e.category,
        e.start_time,
        e.end_time,
        e.timezone,
        e.venue_name,
        e.address,
        e.city,
        e.province,
        e.country,
        e.latitude,
        e.longitude,
        ST_Distance(e.location, user_point) AS distance_meters,
        e.is_free,
        e.price,
        e.currency,
        e.tickets_url,
        e.organizer_name,
        e.organizer_whatsapp,
        e.organizer_instagram,
        e.status,
        e.is_cancelled,
        e.cancellation_notice
    FROM public.events e
    WHERE 
        (e.status = 'publicado' OR e.is_cancelled = TRUE)
        AND e.end_time >= NOW()
        AND ST_DWithin(e.location, user_point, radius_km * 1000)
        AND (filter_category IS NULL OR e.category = filter_category)
        AND (filter_date_start IS NULL OR e.start_time >= filter_date_start)
        AND (filter_date_end IS NULL OR e.start_time <= filter_date_end)
    ORDER BY distance_meters ASC;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Cualquiera puede ver eventos publicados y no finalizados" ON public.events
    FOR SELECT USING (
        status = 'publicado' 
        OR is_cancelled = TRUE 
        OR (auth.uid() = organizer_id)
        OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    );

CREATE POLICY "Organizadores pueden crear eventos" ON public.events
    FOR INSERT WITH CHECK (
        auth.uid() = organizer_id 
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('organizer', 'admin') AND is_suspended = FALSE)
    );

CREATE POLICY "Organizadores pueden editar sus propios eventos" ON public.events
    FOR UPDATE USING (
        auth.uid() = organizer_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Administradores pueden borrar eventos" ON public.events
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Usuarios gestionan sus favoritos" ON public.favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Cualquiera puede crear denuncias" ON public.event_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Solo administradores pueden ver denuncias" ON public.event_reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
