import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import ring from './ring.m4a';
import newParticipant from './newParticipant.m4a';
const Container = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid red;
`;

const Row = styled.div`
  display: flex;
  width: 100%;
`;

const Video = styled.video`
  border: 1px solid blue;
  width: 50%;
  height: 50%;
`;

function App() {
  const [yourID, setYourID] = useState("");
  const [yourName, setYourName] = useState("");
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [users, setUsers] = useState([]);
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);

  const userVideo = useRef();
  const partnerVideo = useRef();
  const socket = useRef();



  useEffect(() => {
    socket.current = io.connect("/", { secure: true, reconnection: true, rejectUnauthorized: false });
    navigator.mediaDevices.getUserMedia({ video: true, audio: true}).then( stream => {
      setStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    socket.current.on("yourUSER", user => {
      console.log('event myId', user)
      setYourID(user.id);
      setYourName(user.name);
    });

    socket.current.on("allUsers", users => {
      let audio = new Audio(newParticipant);
      audio.muted = true;
      audio.play();
      audio.muted = false;       
      setUsers(users)
    });

    socket.current.on("hey", data => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function callPeer(id) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream 
    });

    peer.on("signal", data => {
      socket.current.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: yourID,
      });
    });

    peer.on("stream", stream => {
      if (partnerVideo.current) {
        partnerVideo.current.srcObject = stream
      }
    });

    socket.current.on("callAccepted", signal => {
      setCallAccepted(true);
      peer.signal(signal);
    });
  }

  function acceptCall() {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    });

    peer.on("signal", data => {
      socket.current.emit("acceptCall", {signal: data, to: caller});
    });

    peer.on("stream", stream => {
      partnerVideo.current.srcObject = stream
    });

    peer.signal(callerSignal);;
  }

  let UserVideo;

  if(stream) {
    UserVideo = (
      <Video playsInline muted ref={userVideo} autoPlay />
    );
  }

  let PartnerVideo;

  if(callAccepted) {
    PartnerVideo = (
      <Video playsInline ref={partnerVideo} autoPlay />
    );
  }

  let incomingCall;

  if (receivingCall) {
    function findUser(id) {
      for (var i=0; i < users.length; i++) {
          if (users[i].id == id) {
              console.log('found');
              return users[i];    
          }
      }
    }  
    let callerName = findUser(caller)
    console.log('callername', caller, users, callerName);
    let audio = new Audio(ring);
    audio.muted = true;
    audio.play();
    audio.muted = false;
    if (callerName !== undefined) {
      incomingCall = (
        <div>
          <h1> {callerName.name} is calling you</h1>
          <button onClick={acceptCall}>Accept Call</button> 
        </div>
      )
    }

  }

  let changeName = (event) => {
    console.log('changing name', event.target.value);
    setYourName(event.target.value)
  }

  let submitName = () => {
    socket.current.emit('changeName', yourName)
    setNameSubmitted(true);
  }

  const CallButtons = React.memo((props) => {
    console.log('in call', props);
    return users.map(user => {
      if (user.id === yourID) {
        return null
      } 
      return (<button key={user.id} onClick={() => callPeer(user.id)}> Call {user.name} </button>);
    })
  })
  return (
    <Container>
      <h1> WELCOME TO MS CHAT </h1>
      <Row>
        {UserVideo}
        {PartnerVideo}
      </Row>
      <Row>
        {!nameSubmitted ? 
        <div>
          <span>Metti il tuo nome</span>
          <input type="text"
            value={yourName}
            onChange={event => changeName(event)} />
          <button onClick={submitName}> PREMI </button>        
        </div>
        : null
      }

      </Row>
      <Row>
        <CallButtons users={users}/>
      </Row>
      <Row>
        {incomingCall}
      </Row>
    </Container>
  )
}

export default App;
