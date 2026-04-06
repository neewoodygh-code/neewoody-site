export async function onRequestGet(context) {

  const token = context.env.IG_TOKEN;

  const url =
    `https://graph.instagram.com/me/media` +
    `?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp` +
    `&access_token=${token}`;

  const response = await fetch(url);
  const data = await response.json();

  const items = (data.data || [])
    .filter(item =>
      ["IMAGE", "CAROUSEL_ALBUM", "VIDEO"].includes(item.media_type)
    )
    .slice(0, 6)
    .map(item => ({
      image: item.media_type === "VIDEO"
        ? item.thumbnail_url
        : item.media_url,
      caption: item.caption,
      permalink: item.permalink
    }));

  return new Response(JSON.stringify({ items }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=900"
    }
  });
}
