
var express = require('express');

var sessionUtils = require('../utils/sessionUtils');

var groupdb = require('../models/group/groupdb');

var  asyncdb = require('../models/async/asyncdb');

var router = express.Router();

router.get('/getMembers', function (req, res) {
    var queryData = req.query;
    var order = queryData.order;
    var offset = queryData.offset;
    var limit = queryData.limit;
    var index = queryData.index;
    var pid = queryData.pid;

    //无组别编号
    if (index == null || index == undefined) {
        return res.json({ total: 0, rows: null });
    }

    //无项目编号
    if (pid == null || pid == undefined || pid == -1) {
        return res.json({ total: 0, rows: null });
    }

    groupdb.get_GpMbtotal_byGidPid(pid,index,function(count){

        if(count == 0){
          return res.json({total:count,rows:null});
        }
    
        groupdb.get_groupMember_byGidPid(order,offset,limit,pid,index,function(ret){
          if(ret){
            return res.json({total:count,rows:ret});
          }
        })
    
    });

})

router.get('/addMemberbefore',function(req,res){
    var queryData = req.query;
    var gid = queryData.gid;
    var pid = queryData.pid;

    var data = Promise.all([asyncdb.getMember_byPidGid(pid,gid),asyncdb.getMember_byPid(gid)]);
    //链式处理 ，results 为 同步查询结果
    data.then(function (results) {

        var memArr = new Array();
        for(var i = 0 ; i<results[0].length ; i++){
            var temp = results[0][i];
            memArr.push(temp.uid);
        }

        var needAddArr = new Array();
        for(var i = 0 ; i<results[1].length ; i++ ){
            var temp = results[1][i];
            if(memArr.indexOf(temp.uid) == -1 ){
                needAddArr.push(temp);
            }
        }

        if(needAddArr.length >0){
            res.json({success:true,data:needAddArr});
        }else{
            res.json({success:false,data:null});
        }
    });
})

router.post('/addMemeber',function(req,res){
    var result = sessionUtils.checkUsefulSession(req.session);   

    if(result == 1){
        var submitData = req.body;
        var pid = submitData.pid;
        var gid = submitData.gid;
        var checkArr  = submitData.checkArr;

        var addmember = checkArr.split(',');

        groupdb.add_group(pid,gid,addmember,function(ret){
            if(ret){
                return res.json({success:true,msg:'success'});
            }else{
              return res.json({success:false,msg:'db error'});
            }
        });
    }else{
        return res.json({success:false,msg:'user not sign in'});
    }
})

router.post('/delMemeber',function(req,res){
    var result = sessionUtils.checkUsefulSession(req.session);   

    if(result == 1){
        var submitData = req.body;
        var pid = submitData.pid;
        var gid = submitData.gid;
        var delid  = submitData.delid;

        groupdb.del_member_byuid(pid,gid,delid,function(ret){
            if(ret){
                return res.json({success:true,msg:'success'});
            }else{
              return res.json({success:false,msg:'db error'});
            }
        });
    }else{
        return res.json({success:false,msg:'user not sign in'});
    }
})

router.get('/dispensebefore',function(req,res){
    var queryData = req.query;
    var gid = queryData.gid;
    var pid = queryData.pid;
    var uid = queryData.uid;

    var data = Promise.all([asyncdb.getMS_byPidType(pid,gid),asyncdb.getMS_byOwnPidType(pid,gid,uid)]);
    //链式处理 ，results 为 同步查询结果
    data.then(function (results) {        
        res.json({
            success:true,
            accept:results[1],
            noaccept:results[0]
        });
    });
})

router.post('/dispenseMS',function(req,res){
    var result = sessionUtils.checkUsefulSession(req.session);   

    if(result == 1){
        var submitData = req.body;
        var pid = submitData.pid;
        var gid = submitData.gid;
        var dispenseId  = submitData.dispenseId;
        var udchecked = submitData.udchecked;
        var dchecked = submitData.dchecked;

        //撤销任务，链
        var p1arg1 , p1arg2;
        if(udchecked == null || udchecked == undefined || udchecked == ''){
            //没有需要撤销分配的任务
            p1arg1 = null , p1arg2 = null ;

        }else{
            p1arg1 = udchecked;
            p1arg2 = -1;
        }

        //分配任务，链
        var p2arg1 , p2arg2;
        if(dchecked == null || dchecked == undefined || dchecked == ''){
            //没有需要分配的任务
            p2arg1 =null  , p2arg2 = null;
        }else{
            p2arg1 = dchecked;
            p2arg2 = dispenseId;
        }

        var data = Promise.all([asyncdb.update_msOwn_byid(p1arg1,p1arg2),asyncdb.update_msOwn_byid(p2arg1,p2arg2)]);

        data.then(function (results) {
            
            res.json({success:true});

        });

    }else{
        return res.json({success:false,msg:'user not sign in'});
    }
})



module.exports = router;