// Bundled credits remain readable offline. Add social accounts only with their owner's consent.
export const QQ_GROUP_NUMBER = '1002563035';
export const PROJECT_LINKS = [
 {id:'source',label:'源码仓库',url:'https://github.com/NecoAya/VRCAL-VRChat-Asset-Library'},
 {id:'contribute',label:'贡献指南',url:'https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/blob/main/CONTRIBUTING.md'},
 {id:'feedback',label:'反馈问题',url:'https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/issues/new/choose'},
 {id:'contributors',label:'查看全部贡献者',url:'https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/graphs/contributors'},
] as const;
export interface Contributor {handle:string;name:string;initials:string;role:string;avatar?:string;links:readonly {id:string;label:string;url:string}[]}
export const CONTRIBUTORS = [
 {handle:'NecoAya',name:'八云绫',initials:'N',role:'项目发起与维护',avatar:'necoaya.jpg',links:[
  {id:'necoaya-github',label:'GitHub 主页',url:'https://github.com/NecoAya'},
  {id:'necoaya-bilibili',label:'Bilibili 主页',url:'https://space.bilibili.com/13551697'},
 ]},
 {handle:'KelierAndes',name:'KelierAndes',initials:'K',role:'提交 Unity Prefab 轻量 3D 预览改进（PR #3，评审中）',links:[
  {id:'kelierandes-github',label:'GitHub 主页',url:'https://github.com/KelierAndes'},
  {id:'kelierandes-pr3',label:'PR #3',url:'https://github.com/NecoAya/VRCAL-VRChat-Asset-Library/pull/3'},
 ]},
] as const satisfies readonly Contributor[];
export function communityUrl(id:unknown):string {
 if(typeof id!=='string'||id.length>100)throw new Error('社区链接无效。');
 const links=[...PROJECT_LINKS,...CONTRIBUTORS.flatMap<Contributor['links'][number]>(person=>person.links)];
 const found=links.find(link=>link.id===id);if(!found)throw new Error('社区链接无效。');return found.url;
}
