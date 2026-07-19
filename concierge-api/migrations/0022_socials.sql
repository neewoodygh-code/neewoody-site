-- Member social links + website. Stored as a JSON object of {platform: url}
-- for a fixed set of platforms (website, instagram, tiktok, facebook, youtube,
-- linkedin). Lets members show their work via existing socials instead of us
-- building photo/video hosting for now.
ALTER TABLE members ADD COLUMN socials TEXT;
