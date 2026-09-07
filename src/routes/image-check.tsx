import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AttachmentImage } from '../components/app/attachment-image';
import { AttachmentPreviews } from '../lib/attachment-previews';
import '../app.css';
export const Route = createFileRoute('/image-check')({component: Check});
function Check(){
 const [previews]=useState(()=>new AttachmentPreviews());
 const [attempt,setAttempt]=useState(0);
 function start(){previews.clear();previews.add('local',URL.createObjectURL(new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#d8906a"/><text x="160" y="105" text-anchor="middle" font-size="22">LOCAL PREVIEW</text></svg>'],{type:'image/svg+xml'})));setAttempt(n=>n+1);}
 return <main className="workspace theme-dark" style={{display:'block',padding:40,minHeight:'100vh'}}><button onClick={start}>Start image loading check</button>{attempt>0&&<div style={{display:'flex',gap:24,marginTop:24}}>{['local','received','error'].map(id=><section key={`${id}:${attempt}`}><h2>{id}</h2><AttachmentImage attachmentPreviews={previews} file={{id,name:`${id} image`,byteSize:100,contentType:'image/png',url:`/api/image-check?id=${id}&run=${attempt}`}} onView={()=>{}}/></section>)}</div>}</main>;
}
