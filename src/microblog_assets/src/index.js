import { microblog } from "../../declarations/microblog";
import { idlFactory as microblog_idl, canisterId as microblog_id } from "../../declarations/microblog";
import {Actor, HttpAgent} from "@dfinity/agent";

const agent = new HttpAgent();

const proxy = (canisterId) => {
  const blog = Actor.createActor(microblog_idl, {agent, canisterId})
  return blog
} 

const sortDesc = (a, b) => -Number(a.time - b.time)

const dateFormat = (ts, fmt = 'YY-mm-dd HH:MM:SS') => {
  const date = new Date(Number(ts));
  let ret;
  const opt = {
    'Y+': date.getFullYear().toString(), // 年
    'm+': (date.getMonth() + 1).toString(), // 月
    'd+': date.getDate().toString(), // 日
    'H+': date.getHours().toString(), // 时
    'M+': date.getMinutes().toString(), // 分
    'S+': date.getSeconds().toString(), // 秒
    // 有其他格式化字符需求可以继续添加，必须转化成字符串
  };

  for (const k in opt) {
    ret = new RegExp(`(${k})`).exec(fmt);
    if (ret) {
      fmt = fmt.replace(
        ret[1],
        ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, '0'),
      );
    }
  }
  return fmt;
}

async function timeline(since=0){
  const res = await microblog.timeline(since);
  return res.sort(sortDesc);
}

function renderPosts(posts){
  console.log("renderPosts:",posts);
  const template = `
  <div class="d-flex text-muted pt-3">
    <svg class="bd-placeholder-img flex-shrink-0 me-2 rounded" width="32" height="32" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Placeholder: 32x32" preserveAspectRatio="xMidYMid slice" focusable="false"><title>Placeholder</title><rect width="100%" height="100%" fill="#007bff"/><text x="50%" y="50%" fill="#007bff" dy=".3em">32x32</text></svg>
    <div class="pb-3 mb-0 small lh-sm border-bottom w-100">
      <div class="d-flex justify-content-between">
        <strong class="text-gray-dark">#text#</strong>
        <a href="#">#time#</a>
      </div>
      <span class="d-block">@#author#</span>
    </div>
  </div>
`
  let html_content = ""
  for (let i = 0; i < posts.length; i++) { 
    console.log(posts[i]['time'], posts[i]['time']/1000000n)
    const myNumber = Number(posts[i]['time']/1000000n);    
    const time_str = dateFormat(myNumber);
    console.log(time_str);
    const author = posts[i]['author'] in authors ? authors[posts[i]['author']] : posts[i]['author']
    html_content += template.replace('#author#', author).replace('#text#', posts[i]['text']).replace('#time#', time_str)
}

  document.getElementById("posts").innerHTML = html_content
}

async function post(){
  let post_button = document.getElementById("submit_post");
  let error = document.getElementById("err");
  error.innerText = "";
  post_button.disabled = true;
  let textarea = document.getElementById("content");
  let text = textarea.value;
  let otp = document.getElementById("secret").value;
  try{
    await microblog.post(otp,text);
    const cur_posts = await timeline();
    renderPosts(cur_posts);
    textarea.value = "";
  }catch(err){
    console.log(err);
    error.innerText = "Post Failed!";
  }
  
  post_button.disabled = false;
}

var num_posts = 0;
async function load_posts(){
  let posts_section = document.getElementById("posts");
  let posts = await microblog.posts(0);
  if(num_posts == posts.length) return;
  posts_section.replaceChildren([]);
  num_posts = posts.length;
  for(var i = 0;i < posts.length;i++){
    let post = document.createElement("p");
    post.innerText = posts[i].text;
    posts_section.appendChild(post);
  }
}

const authors = {};
async function getName(){
  const res = await microblog.get_name();
  authors[microblog_id] = res ? res[0] : microblog_id;
  return res && res[0];
}

async function setName(name){
  await microblog.set_name(name);
}

async function rename(){
  const btn = document.getElementById("rename_btn");
  btn.disabled = true;
  const name  = document.getElementById("name").value;
  await setName(name);
  document.getElementById("author").innerText = await getName();
  btn.disabled = false;
}

async function follows(){
  const res = await microblog.follows();
  const fls = {};
  for(let i = 0; i < res.length; i++){
    const name = await proxy(res[i]).get_name();
    console.log("follow", res[i], name?name[0]:'');
    authors[res[i]] = name?name[0]:'';
    fls[res[i]] = name?name[0]:'';
  }
  return fls;
}

async function followPosts(id){
  console.log("e:", id);
  const posts = await proxy(id).posts(0)
  renderPosts(posts)
}

function renderFollows(fls){
  console.log("renderFollows:",fls)
  const template = `
    <li class="list-group-item d-flex justify-content-between lh-sm" name="follow" style="cursor: pointer;" id="#id#">
      <div>
        <h6 class="my-0">#name#</h6>
        <small class="text-muted">#id#</small>
      </div>
    </li>
  `
  let html_content = ""
  for(let key in fls){
    html_content += template.replaceAll('#id#', key).replaceAll('#name#', fls[key])
  }

  document.getElementById("follows").innerHTML = html_content;

  document.getElementsByName("follow").forEach(element => {
    console.log("follow:", element,element.id)
    element.onclick = ()=>followPosts(element.id)
  });
}

async function load(){
/*
  let post_button = document.getElementById("post");
  post_button.onclick = post;
  let usr_button = document.getElementById("set_name");
  usr_button.onclick = set_name;
  load_posts();
  get_name();
  setInterval(load_posts, 3000);
*/
 const author = await getName();
 document.getElementById("author").innerText = author;
 document.getElementById("rename_btn").onclick = rename;

 document.getElementById("submit_post").onclick = post;

 const cur_follows = await follows();
 renderFollows(cur_follows);

 const cur_posts = await timeline();
 renderPosts(cur_posts);
}

window.onload = load;