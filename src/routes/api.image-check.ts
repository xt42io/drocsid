import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/api/image-check')({server:{handlers:{GET:async({request})=>{
 const url=new URL(request.url);await new Promise(resolve=>setTimeout(resolve,8000));
 if(url.searchParams.get('id')==='error'&&!url.searchParams.has('retry'))return new Response('',{status:503});
 return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#a4b29e"/><text x="160" y="105" text-anchor="middle" font-size="22">STORED IMAGE</text></svg>',{headers:{'content-type':'image/svg+xml','cache-control':'no-store'}});
}}}});
