// ============================================================
// 📹 WEBRTC VIDEO STREAMING SERVICE
// ============================================================

class WebRTCService {
    constructor() {
        this.peerConnections = {};
        this.localStream = null;
        this.remoteStreams = {};
        this.onStreamCallback = null;
        
        // STUN/TURN servers
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // Add TURN servers for NAT traversal
                /*
                {
                    urls: 'turn:your-turn-server.com:3478',
                    username: 'username',
                    credential: 'password'
                }
                */
            ],
            iceCandidatePoolSize: 10
        };
    }

    // ============================================
    // STUDENT: Start Camera Stream
    // ============================================
    async startStudentStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15 }
                },
                audio: false
            });
            
            console.log('📹 Student camera started');
            return this.localStream;
            
        } catch (error) {
            console.error('❌ Camera error:', error);
            throw error;
        }
    }

    // ============================================
    // STUDENT: Create Connection to Admin
    // ============================================
    createStudentConnection(studentId, adminId) {
        const peerId = `${studentId}_${adminId}`;
        
        if (this.peerConnections[peerId]) {
            return this.peerConnections[peerId];
        }

        const pc = new RTCPeerConnection(this.config);
        
        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignaling({
                    type: 'candidate',
                    studentId: studentId,
                    adminId: adminId,
                    candidate: event.candidate
                });
            }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
            console.log(`🔗 Connection state: ${pc.connectionState}`);
            if (pc.connectionState === 'connected') {
                console.log('✅ Video stream connected!');
            }
        };

        this.peerConnections[peerId] = pc;
        return pc;
    }

    // ============================================
    // STUDENT: Create Offer
    // ============================================
    async createOffer(studentId, adminId) {
        const peerId = `${studentId}_${adminId}`;
        const pc = this.peerConnections[peerId];
        
        if (!pc) return null;

        try {
            const offer = await pc.createOffer({
                offerToReceiveVideo: false,
                offerToReceiveAudio: false
            });
            
            await pc.setLocalDescription(offer);
            
            // Send offer to admin via signaling
            this.sendSignaling({
                type: 'offer',
                studentId: studentId,
                adminId: adminId,
                offer: offer
            });
            
            console.log('📤 Offer sent to admin');
            return offer;
            
        } catch (error) {
            console.error('❌ Error creating offer:', error);
            throw error;
        }
    }

    // ============================================
    // ADMIN: Accept Connection
    // ============================================
    async acceptConnection(studentId, adminId, offer) {
        const peerId = `${studentId}_${adminId}`;
        
        // Create peer connection for admin
        const pc = new RTCPeerConnection(this.config);
        
        // Handle incoming stream
        pc.ontrack = (event) => {
            console.log('📹 Received video stream from student:', studentId);
            
            if (this.onStreamCallback) {
                this.onStreamCallback(studentId, event.streams[0]);
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignaling({
                    type: 'candidate',
                    studentId: studentId,
                    adminId: adminId,
                    candidate: event.candidate,
                    isAdmin: true
                });
            }
        };

        // Set remote description (offer from student)
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        // Create answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        // Send answer back to student
        this.sendSignaling({
            type: 'answer',
            studentId: studentId,
            adminId: adminId,
            answer: answer
        });

        this.peerConnections[peerId] = pc;
        console.log('✅ Admin accepted video connection');
        
        return pc;
    }

    // ============================================
    // STUDENT: Accept Answer
    // ============================================
    async acceptAnswer(studentId, adminId, answer) {
        const peerId = `${studentId}_${adminId}`;
        const pc = this.peerConnections[peerId];
        
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('✅ Student accepted answer');
    }

    // ============================================
    // HANDLE ICE Candidates
    // ============================================
    async handleCandidate(studentId, adminId, candidate, isAdmin) {
        const peerId = `${studentId}_${adminId}`;
        const pc = this.peerConnections[peerId];
        
        if (!pc) return;

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('✅ ICE candidate added');
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }

    // ============================================
    // SIGNALING: Send messages (via Supabase or WebSocket)
    // ============================================
    async sendSignaling(data) {
        // Option 1: Using Supabase Realtime
        try {
            await supabase.from('webrtc_signaling').insert({
                student_id: data.studentId,
                admin_id: data.adminId || 'admin',
                type: data.type,
                payload: data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('❌ Signaling error:', error);
        }
        
        // Option 2: Using Socket.io (recommended for faster signaling)
        // if (window.socket) {
        //     window.socket.emit('webrtc-signal', data);
        // }
    }

    // ============================================
    // LISTEN for Signaling Messages
    // ============================================
    async listenForSignaling(studentId) {
        // Option 1: Supabase Realtime
        const subscription = supabase
            .channel('webrtc-signaling')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'webrtc_signaling',
                    filter: `student_id=eq.${studentId}`
                },
                async (payload) => {
                    const data = payload.new.payload;
                    await this.handleSignaling(data);
                }
            )
            .subscribe();

        // Option 2: Socket.io
        // if (window.socket) {
        //     window.socket.on('webrtc-signal', async (data) => {
        //         await this.handleSignaling(data);
        //     });
        // }
    }

    // ============================================
    // HANDLE Signaling Messages
    // ============================================
    async handleSignaling(data) {
        console.log('📨 Signaling received:', data.type);

        switch (data.type) {
            case 'offer':
                // Admin received offer from student
                await this.acceptConnection(
                    data.studentId,
                    data.adminId,
                    data.offer
                );
                break;

            case 'answer':
                // Student received answer from admin
                await this.acceptAnswer(
                    data.studentId,
                    data.adminId,
                    data.answer
                );
                break;

            case 'candidate':
                // Both sides receive ICE candidates
                await this.handleCandidate(
                    data.studentId,
                    data.adminId,
                    data.candidate,
                    data.isAdmin || false
                );
                break;
        }
    }

    // ============================================
    // CLOSE Connection
    // ============================================
    closeConnection(studentId, adminId) {
        const peerId = `${studentId}_${adminId}`;
        const pc = this.peerConnections[peerId];
        
        if (pc) {
            pc.close();
            delete this.peerConnections[peerId];
            console.log('🔌 Connection closed:', peerId);
        }
    }

    // ============================================
    // STOP Local Stream
    // ============================================
    stopStream() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
            console.log('📹 Local stream stopped');
        }
    }
}

// Initialize WebRTC
window.webrtc = new WebRTCService();
console.log('✅ WebRTC Service initialized');
